import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { worlds } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = db.select().from(worlds)
    .where(eq(worlds.userId, session.userId))
    .all();

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, narrativeMd } = await req.json();
  if (!narrativeMd) return NextResponse.json({ error: "Narrative required" }, { status: 400 });

  if (id) {
    // Update existing world
    const existing = db.select().from(worlds)
      .where(and(eq(worlds.id, id), eq(worlds.userId, session.userId)))
      .all()[0];
    if (!existing) return NextResponse.json({ error: "World not found" }, { status: 404 });

    db.update(worlds).set({
      ...(name && { name }),
      narrativeMd,
      updatedAt: new Date(),
    }).where(eq(worlds.id, id)).run();

    const updated = db.select().from(worlds).where(eq(worlds.id, id)).all()[0];
    return NextResponse.json(updated);
  }

  // Create new world
  const newId = nanoid();
  db.insert(worlds).values({
    id: newId,
    userId: session.userId,
    narrativeMd,
    name: name || "我的世界",
  }).run();

  const created = db.select().from(worlds).where(eq(worlds.id, newId)).all()[0];
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const world = db.select().from(worlds)
    .where(and(eq(worlds.id, id), eq(worlds.userId, session.userId)))
    .all()[0];
  if (!world) return NextResponse.json({ error: "World not found" }, { status: 404 });

  db.delete(worlds).where(eq(worlds.id, id)).run();
  return NextResponse.json({ ok: true });
}
