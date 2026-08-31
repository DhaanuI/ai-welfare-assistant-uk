import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { CaseStatus } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED: CaseStatus[] = ["new", "in_progress", "resolved"];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { id } = await ctx.params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: CaseStatus };

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "case not found" }, { status: 404 });

  await prisma.case.update({
    where: { id },
    data: {
      status,
      // moving back to "new" releases the claim so someone else can pick it up
      ...(status === "new" ? { claimedById: null, claimedAt: null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
