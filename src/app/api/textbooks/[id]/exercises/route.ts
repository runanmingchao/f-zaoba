import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises, textbooks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  // Verify textbook ownership
  const tb = db.select().from(textbooks)
    .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
    .all()[0];
  if (!tb) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });

  const rows = db.select().from(exercises)
    .where(and(eq(exercises.textbookId, textbookId), eq(exercises.userId, session.userId)))
    .orderBy(desc(exercises.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  // Verify textbook ownership
  const tb = db.select().from(textbooks)
    .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
    .all()[0];
  if (!tb) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });

  const { question, answer, topic } = await req.json();
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });

  const id = nanoid();
  db.insert(exercises).values({
    id,
    textbookId,
    userId: session.userId,
    question,
    answer: answer || "",
    topic: topic || null,
  }).run();

  const created = db.select().from(exercises).where(eq(exercises.id, id)).all()[0];
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  const { exerciseId, answer } = await req.json();
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const ex = db.select().from(exercises)
    .where(and(
      eq(exercises.id, exerciseId),
      eq(exercises.textbookId, textbookId),
      eq(exercises.userId, session.userId)
    ))
    .all()[0];
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  db.update(exercises).set({ answer: answer || "" }).where(eq(exercises.id, exerciseId)).run();

  const updated = db.select().from(exercises).where(eq(exercises.id, exerciseId)).all()[0];
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  const { exerciseId } = await req.json();
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const ex = db.select().from(exercises)
    .where(and(
      eq(exercises.id, exerciseId),
      eq(exercises.textbookId, textbookId),
      eq(exercises.userId, session.userId)
    ))
    .all()[0];
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  db.delete(exercises).where(eq(exercises.id, exerciseId)).run();
  return NextResponse.json({ ok: true });
}
