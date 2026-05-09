import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { flashcards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = db.select().from(flashcards)
    .where(and(eq(flashcards.id, id), eq(flashcards.userId, session.userId)))
    .all()[0];

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(flashcards).set({
    reviewCount: card.reviewCount + 1,
    lastReviewedAt: new Date(),
  }).where(eq(flashcards.id, id)).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = db.select().from(flashcards)
    .where(and(eq(flashcards.id, id), eq(flashcards.userId, session.userId)))
    .all()[0];

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(flashcards).where(eq(flashcards.id, id)).run();
  return NextResponse.json({ ok: true });
}
