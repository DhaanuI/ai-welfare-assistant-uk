// Orchestrates one student turn: persist the message, triage it, persist the
// triage result, open a case if we're escalating, generate the reply, persist it.

import { prisma } from "./db";
import { triageMessage, generateReply, type ConversationTurn, type TriageOutcome } from "./triage";
import { runSafetyChecks, EMERGENCY_SUPPORT_TEXT } from "./safety";
import type { Prisma } from "@prisma/client";

export interface TurnInput {
  conversationId?: string;
  text: string;
  studentName?: string;
  studentEmail?: string;
}

export interface TurnResult {
  conversationId: string;
  reply: string;
  triage: TriageOutcome;
  escalated: boolean;
}

export async function handleStudentMessage(input: TurnInput): Promise<TurnResult> {
  const text = input.text.trim();
  if (!text) throw new Error("empty message");

  // 1. find or create the conversation
  let conversation = input.conversationId
    ? await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } }, case: true },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        studentName: input.studentName?.trim() || null,
        studentEmail: input.studentEmail?.trim() || null,
      },
      include: { messages: { orderBy: { createdAt: "asc" } }, case: true },
    });
  } else if (input.studentName || input.studentEmail) {
    // fill in contact details if they arrived later in the conversation
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        studentName: conversation.studentName ?? input.studentName?.trim() ?? null,
        studentEmail: conversation.studentEmail ?? input.studentEmail?.trim() ?? null,
      },
      include: { messages: { orderBy: { createdAt: "asc" } }, case: true },
    });
  }

  const history: ConversationTurn[] = conversation.messages
    .filter((m) => m.role === "student" || m.role === "assistant")
    .map((m) => ({ role: m.role as "student" | "assistant", content: m.content }));

  // 2. persist the inbound student message
  const studentMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: "student", content: text },
  });

  // 2b. Already escalated and still open? Don't re-run the full LLM pipeline on every
  // follow-up message — the case is already in the human queue, re-triaging each new
  // message wastes two model calls and risks the assistant contradicting the escalation
  // (e.g. answering a routine follow-up as if nothing happened). Instead: run the cheap,
  // free, deterministic safety check only (so a new message can still raise the case to
  // safeguarding if it introduces crisis language the original one didn't), persist a
  // carried-forward triage result for the audit trail, and reply with a fixed
  // acknowledgement — no model call needed either way.
  if (conversation.case && conversation.case.status !== "resolved") {
    const signals = runSafetyChecks(text);
    const newlyUnsafe = signals.crisis && !conversation.case.safeguarding;

    if (newlyUnsafe) {
      await prisma.case.update({
        where: { conversationId: conversation.id },
        data: { safeguarding: true },
      });
    }

    const carried: TriageOutcome = {
      category: conversation.case.category,
      urgency: conversation.case.urgency,
      safeguarding: conversation.case.safeguarding || signals.crisis,
      disposition: "escalate",
      modelOk: true,
      appliedRules: ["already_escalated_carry_forward", ...(newlyUnsafe ? ["crisis_escalate"] : [])],
      staffSummary: conversation.case.summary,
      reasoning: "Conversation already has an open case; carried forward without re-triaging.",
      clarifyingQuestion: "",
      surfaceEmergencySupport: signals.crisis || signals.immediateDanger,
      rawModel: null,
    };

    await prisma.triageResult.create({
      data: {
        conversationId: conversation.id,
        messageId: studentMessage.id,
        category: carried.category,
        urgency: carried.urgency,
        safeguarding: carried.safeguarding,
        disposition: carried.disposition,
        modelOk: carried.modelOk,
        appliedRules: carried.appliedRules,
        reasoning: carried.reasoning,
      },
    });

    const ack =
      "Thanks — I've added that to your case. A member of the team already has this and will follow up with you by email, so I don't need to ask anything further right now.";
    const reply = carried.surfaceEmergencySupport ? `${EMERGENCY_SUPPORT_TEXT}\n\n${ack}` : ack;

    await prisma.message.create({
      data: { conversationId: conversation.id, role: "assistant", content: reply },
    });

    return { conversationId: conversation.id, reply, triage: carried, escalated: true };
  }

  // 3. triage (model + validation + house rules)
  const triage = await triageMessage(text, history);

  // 4. persist the triage result
  await prisma.triageResult.create({
    data: {
      conversationId: conversation.id,
      messageId: studentMessage.id,
      category: triage.category,
      urgency: triage.urgency,
      safeguarding: triage.safeguarding,
      disposition: triage.disposition,
      modelOk: triage.modelOk,
      appliedRules: triage.appliedRules,
      reasoning: triage.reasoning,
      rawModel: (triage.rawModel ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  // 5. open (or keep) a case when escalating
  let escalated = false;
  if (triage.disposition === "escalate") {
    escalated = true;
    if (!conversation.case) {
      await prisma.case.create({
        data: {
          conversationId: conversation.id,
          summary: triage.staffSummary,
          category: triage.category,
          urgency: triage.urgency,
          safeguarding: triage.safeguarding,
        },
      });
    } else {
      // keep the case's urgency/safeguarding at the highest seen
      await prisma.case.update({
        where: { conversationId: conversation.id },
        data: {
          safeguarding: conversation.case.safeguarding || triage.safeguarding,
          summary: triage.staffSummary || conversation.case.summary,
        },
      });
    }
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "escalated" },
    });
  }

  // 6. generate + persist the student-facing reply
  const reply = await generateReply(triage, text, history);
  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: reply },
  });

  return { conversationId: conversation.id, reply, triage, escalated };
}
