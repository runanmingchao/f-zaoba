import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("socratopia.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

import { eq, and } from "drizzle-orm";

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;

export function getUserKey(userId: string, preferredProvider?: string | null) {
  const all = db.select().from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId))
    .all();

  if (all.length === 0) return null;

  if (preferredProvider) {
    const match = all.find(k => k.provider === preferredProvider);
    if (match) return match;
  }

  return all[0];
}
