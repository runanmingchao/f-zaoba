import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { encrypt } from "@/lib/utils/encryption";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider, apiKey, baseUrl, model } = await req.json();
  if (!provider || !apiKey) {
    return NextResponse.json({ error: "Provider and apiKey required" }, { status: 400 });
  }

  const encryptedKey = await encrypt(apiKey);

  const existing = db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, session.userId), eq(apiKeys.provider, provider)))
    .all()[0];

  if (existing) {
    db.update(apiKeys)
      .set({ encryptedKey, ...(baseUrl !== undefined && { baseUrl }), ...(model !== undefined && { model }) })
      .where(eq(apiKeys.id, existing.id))
      .run();
  } else {
    db.insert(apiKeys).values({
      id: nanoid(),
      userId: session.userId,
      provider,
      encryptedKey,
      baseUrl: baseUrl || null,
      model: model || null,
    }).run();
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = db.select().from(apiKeys)
    .where(eq(apiKeys.userId, session.userId))
    .all();

  return NextResponse.json(keys.map(k => ({ provider: k.provider, hasKey: k.encryptedKey.length > 0 })));
}
