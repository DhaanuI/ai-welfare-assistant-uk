import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// Concurrency-safe claim.
//
// The claim is a single conditional UPDATE: "set claimedBy = me WHERE id = :id
// AND claimedById IS NULL". Postgres serialises the row write, so of two
// simultaneous requests exactly one matches (updateMany count === 1) and the
// other matches zero rows and is told the case is already taken.
//
// Without this (read-then-write in app code) both requests would read
// claimedById === null, both would write, and the second silently overwrites the
// first — two staff on the same student in crisis.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { id } = await ctx.params;

  const { count } = await prisma.case.updateMany({
    where: { id, claimedById: null },
    data: { claimedById: session.staffId, claimedAt: new Date(), status: "in_progress" },
  });

  if (count === 0) {
    const existing = await prisma.case.findUnique({
      where: { id },
      include: { claimedBy: { select: { name: true } } },
    });
    if (!existing) return NextResponse.json({ error: "case not found" }, { status: 404 });
    return NextResponse.json(
      { error: "already_claimed", claimedBy: existing.claimedBy?.name ?? "another staff member" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
