import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pref = db.select().from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .all()[0];

  return NextResponse.json(pref || {
    preferredStyle: "default",
    preferredTheme: "light",
    styleOverride: null,
    fontFamily: null,
    fontSize: "medium",
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { preferredStyle, preferredTheme, styleOverride, fontFamily, fontSize } = await req.json();

  const existing = db.select().from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .all()[0];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (preferredStyle !== undefined) updateData.preferredStyle = preferredStyle;
  if (preferredTheme !== undefined) updateData.preferredTheme = preferredTheme;
  if (styleOverride !== undefined) updateData.styleOverride = styleOverride;
  if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
  if (fontSize !== undefined) updateData.fontSize = fontSize;

  if (existing) {
    db.update(userPreferences).set(updateData)
      .where(eq(userPreferences.userId, session.userId)).run();
  } else {
    db.insert(userPreferences).values({
      userId: session.userId,
      preferredStyle: preferredStyle || "default",
      preferredTheme: preferredTheme || "light",
      styleOverride: styleOverride || null,
      fontFamily: fontFamily || null,
      fontSize: fontSize || "medium",
    }).run();
  }

  return NextResponse.json({ ok: true });
}
