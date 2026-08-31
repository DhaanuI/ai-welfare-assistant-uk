import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const staff = await prisma.staffUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!staff || !(await verifyPassword(password, staff.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  await createSession({ staffId: staff.id, email: staff.email, name: staff.name });
  return NextResponse.json({ ok: true });
}
