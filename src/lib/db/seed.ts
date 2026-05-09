import { db } from "./index";
import { companions, worlds } from "./schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

const SEED_DIR = path.join(process.cwd(), "src/lib/db/seed");

const PRESET_COMPANIONS = [
  { slug: "socrates", name: "苏格拉底", file: "socrates.md", avatar: "/avatars/socrates.png" },
  { slug: "zhugeliang", name: "诸葛亮", file: "zhugeliang.md", avatar: "/avatars/zhugeliang.png" },
  { slug: "wangyangming", name: "王阳明", file: "wangyangming.md", avatar: "/avatars/wangyangming.png" },
];

export function seedPresets(userId: string) {
  const existing = db.select({ name: companions.name })
    .from(companions)
    .where(and(eq(companions.isPreset, true), eq(companions.userId, userId)))
    .all();

  if (existing.length >= 3) return []; // Already seeded

  const inserted: string[] = [];

  for (const preset of PRESET_COMPANIONS) {
    const alreadyExists = existing.find(e => e.name === preset.name);
    if (alreadyExists) continue;

    const filePath = path.join(SEED_DIR, preset.file);
    let personaMd: string;
    try {
      personaMd = fs.readFileSync(filePath, "utf-8");
    } catch {
      console.error(`Seed file not found: ${filePath}, skipping ${preset.name}`);
      continue;
    }

    db.insert(companions).values({
      id: nanoid(),
      userId,
      name: preset.name,
      avatarUrl: preset.avatar,
      personaMd,
      isPreset: true,
    }).run();
    inserted.push(preset.name);
  }

  // Seed world narrative if none exists
  const existingWorld = db.select().from(worlds)
    .where(eq(worlds.userId, userId))
    .all();

  if (existingWorld.length === 0) {
    let narrativeMd: string;
    try {
      narrativeMd = fs.readFileSync(path.join(SEED_DIR, "world_narrative.md"), "utf-8");
    } catch {
      console.error("World narrative seed file not found, skipping world seed");
      return inserted;
    }
    db.insert(worlds).values({
      id: nanoid(),
      userId,
      narrativeMd,
      name: "先贤之灵",
    }).run();
  }

  return inserted;
}
