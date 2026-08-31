import { NextResponse } from "next/server";
import { handleStudentMessage } from "@/lib/conversationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { conversationId, text, studentName, studentEmail } = (body ?? {}) as Record<
    string,
    string | undefined
  >;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  try {
    const result = await handleStudentMessage({
      conversationId: conversationId || undefined,
      text,
      studentName,
      studentEmail,
    });
    return NextResponse.json({
      conversationId: result.conversationId,
      reply: result.reply,
      escalated: result.escalated,
    });
  } catch (err) {
    console.error("chat route error:", err);
    return NextResponse.json(
      {
        conversationId: conversationId ?? null,
        reply:
          "Sorry — something went wrong on my end. If this is urgent or about your safety, please call 999, or Samaritans on 116 123. Otherwise please try again in a moment.",
        escalated: false,
      },
      { status: 200 },
    );
  }
}
