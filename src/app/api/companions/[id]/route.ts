import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { companions } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const companion = db.select().from(companions)
    .where(and(eq(companions.id, id), or(eq(companions.isPreset, true), eq(companions.userId, session.userId))))
    .all()[0];

  if (!companion) return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  return NextResponse.json(companion);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const companion = db.select().from(companions)
    .where(and(eq(companions.id, id), eq(companions.userId, session.userId)))
    .all()[0];

  if (!companion) return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  if (companion.isPreset) return NextResponse.json({ error: "预设同伴不能删除" }, { status: 403 });

  db.delete(companions).where(eq(companions.id, id)).run();
  return NextResponse.json({ success: true });
}
