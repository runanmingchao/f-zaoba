import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { textbooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: textbookId } = await params;

  const tb = db.select().from(textbooks)
    .where(and(eq(textbooks.id, textbookId), eq(textbooks.userId, session.userId)))
    .all()[0];
  if (!tb) return NextResponse.json({ error: "Textbook not found" }, { status: 404 });

  return NextResponse.json({
    status: (tb as any).parseStatus || "idle",
    progress: (tb as any).parseProgress || 0,
    error: (tb as any).parseError || null,
    lastParseAt: (tb as any).lastParseAt || null,
  });
}