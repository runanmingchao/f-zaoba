import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { textbooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const textbook = db.select().from(textbooks)
    .where(and(eq(textbooks.id, id), eq(textbooks.userId, session.userId)))
    .all()[0];

  if (!textbook) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
  return NextResponse.json(textbook);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const textbook = db.select().from(textbooks)
    .where(and(eq(textbooks.id, id), eq(textbooks.userId, session.userId)))
    .all()[0];

  if (!textbook) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });

  db.delete(textbooks).where(eq(textbooks.id, id)).run();
  return NextResponse.json({ ok: true });
}
