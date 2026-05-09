import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { textbooks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db.select().from(textbooks)
    .where(eq(textbooks.userId, session.userId))
    .orderBy(desc(textbooks.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Title and content required" }, { status: 400 });

  const chapters = extractChapters(content);
  const id = nanoid();

  db.insert(textbooks).values({
    id,
    userId: session.userId,
    title,
    parsedContent: content,
    chapterCount: chapters.length,
  }).run();

  return NextResponse.json({ id, title, chapterCount: chapters.length });
}

function extractChapters(content: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  const chapters: string[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    chapters.push(match[1]);
  }
  return chapters;
}
