import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch a conversation's messages so a returning student can reopen it.
export async function GET(_req: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await ctx.params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      studentName: true,
      studentEmail: true,
      status: true,
      messages: {
        where: { role: { in: ["student", "assistant"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(conversation);
}
