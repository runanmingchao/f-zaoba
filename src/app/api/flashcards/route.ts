import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { flashcards } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db.select().from(flashcards)
    .where(eq(flashcards.userId, session.userId))
    .orderBy(desc(flashcards.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { front, back, deckName } = await req.json();
  if (!front || !back) return NextResponse.json({ error: "Front and back required" }, { status: 400 });

  const id = nanoid();
  db.insert(flashcards).values({
    id,
    userId: session.userId,
    front,
    back,
    deckName: deckName || "default",
  }).run();

  return NextResponse.json({ id });
}
