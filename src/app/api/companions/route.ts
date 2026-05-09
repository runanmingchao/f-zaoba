import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { companions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = db.select().from(companions)
    .where(eq(companions.userId, session.userId))
    .all();

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, personaMd, avatarUrl } = await req.json();
  if (!name || !personaMd) {
    return NextResponse.json({ error: "Name and persona required" }, { status: 400 });
  }

  const userCompanions = db.select().from(companions)
    .where(eq(companions.userId, session.userId))
    .all();

  if (userCompanions.length >= 9) {
    return NextResponse.json({ error: "最多 9 个同伴" }, { status: 400 });
  }

  const id = nanoid();
  db.insert(companions).values({
    id,
    userId: session.userId,
    name,
    personaMd,
    avatarUrl: avatarUrl || null,
    isPreset: false,
  }).run();

  const created = db.select().from(companions).where(eq(companions.id, id)).all()[0];
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, personaMd, avatarUrl } = await req.json();
  if (!id) return NextResponse.json({ error: "Companion ID required" }, { status: 400 });

  const companion = db.select().from(companions)
    .where(and(eq(companions.id, id), eq(companions.userId, session.userId)))
    .all()[0];

  if (!companion) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

  db.update(companions).set({
    ...(name && { name }),
    ...(personaMd && { personaMd }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    updatedAt: new Date(),
  }).where(eq(companions.id, id)).run();

  const updated = db.select().from(companions).where(eq(companions.id, id)).all()[0];
  return NextResponse.json(updated);
}
