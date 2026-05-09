import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, companions } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const rows = db.select({
    id: conversations.id,
    companionId: conversations.companionId,
    worldId: conversations.worldId,
    title: conversations.title,
    status: conversations.status,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
    companionName: companions.name,
    mode: conversations.mode,
    messageCount: sql<number>`(SELECT COUNT(*) FROM messages WHERE messages.conversation_id = ${conversations.id})`,
  })
    .from(conversations)
    .leftJoin(companions, eq(conversations.companionId, companions.id))
    .where(
      statusFilter
        ? and(eq(conversations.userId, session.userId), eq(conversations.status, statusFilter as "active" | "archived"))
        : eq(conversations.userId, session.userId)
    )
    .orderBy(desc(conversations.updatedAt))
    .all();

  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, title, mode } = await req.json();
  if (!id) return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });

  const conv = db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)))
    .all()[0];

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updateData.status = status;
  if (title !== undefined) updateData.title = title;
  if (mode) updateData.mode = mode;

  db.update(conversations).set(updateData).where(eq(conversations.id, id)).run();
  return NextResponse.json({ success: true, id, status: updateData.status || conv.status });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });

  const conv = db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)))
    .all()[0];

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  db.delete(conversations).where(eq(conversations.id, id)).run();
  return NextResponse.json({ success: true });
}
