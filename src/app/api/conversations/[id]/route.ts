import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages, companions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conv = db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)))
    .all()[0];

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const msgs = db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .all()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Enrich messages with companion names
  const enriched = msgs.map(m => {
    let companionName: string | null = null;
    if (m.companionId) {
      const c = db.select().from(companions).where(eq(companions.id, m.companionId)).all()[0];
      companionName = c?.name || null;
    }
    return { ...m, companionName };
  });

  return NextResponse.json({ ...conv, messages: enriched });
}
