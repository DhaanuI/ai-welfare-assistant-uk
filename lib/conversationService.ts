// Orchestrates one student turn: persist the message, triage it, persist the
// triage result, open a case if we're escalating, generate the reply, persist it.

import { prisma } from "./db";
import { triageMessage, generateReply, type ConversationTurn, type TriageOutcome } from "./triage";
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
