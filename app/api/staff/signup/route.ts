import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

// Self-serve staff signup for this assessment build.
//
// Production note: this endpoint is intentionally open (anyone with the URL
// can create a staff account) because there's no admin/organisation layer to
// gate it against yet. In production this would require an invite token from
// an existing admin, or a domain-restricted + admin-approved signup — see
// README "production-level improvements". Left open here so the reviewer can
// create a staff login without needing seeded credentials.
export async function POST(req: Request) {
  const { name, email, password } = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }
  const normalisedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalisedEmail)) {
    return NextResponse.json({ error: "enter a valid email" }, { status: 400 });
  }

  try {
    const staff = await prisma.staffUser.create({
      data: {
        name: name.trim(),
        email: normalisedEmail,
        passwordHash: await hashPassword(password),
      },
    });
    await createSession({ staffId: staff.id, email: staff.email, name: staff.name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "an account with that email already exists" }, { status: 409 });
    }
    console.error("staff signup error:", err);
    return NextResponse.json({ error: "could not create account" }, { status: 500 });
  }
}
