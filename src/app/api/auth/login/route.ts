import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  const user = db.select().from(users).where(eq(users.email, email)).all()[0];
  if (!user) {
    return NextResponse.json({ error: "账号不存在，请先注册" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  await createSession(user.id, user.email);
  return NextResponse.json({ userId: user.id, email: user.email });
}
