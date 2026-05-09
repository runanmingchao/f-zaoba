import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { diaryEntries } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db.select().from(diaryEntries)
    .where(eq(diaryEntries.userId, session.userId))
    .orderBy(desc(diaryEntries.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentMd, conversationId } = await req.json();
  if (!contentMd) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const id = nanoid();
  db.insert(diaryEntries).values({
    id,
    userId: session.userId,
    conversationId: conversationId || null,
    contentMd,
  }).run();

  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const entry = db.select().from(diaryEntries)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, session.userId)))
    .all()[0];
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(diaryEntries).where(eq(diaryEntries.id, id)).run();
  return NextResponse.json({ ok: true });
}
