import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { seedPresets } from "@/lib/db/seed";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const existing = db.select().from(users).where(eq(users.email, email)).all()[0];
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const userId = nanoid();
  const passwordHash = await hashPassword(password);
  db.insert(users).values({
    id: userId,
    email,
    name: name || email.split("@")[0],
    passwordHash,
  }).run();
  const user = db.select().from(users).where(eq(users.id, userId)).all()[0];
  seedPresets(userId);

  await createSession(user.id, email);
  return NextResponse.json({ userId: user.id, email: user.email });
}
