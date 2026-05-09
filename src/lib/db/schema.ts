import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const companions = sqliteTable("companions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  personaMd: text("persona_md").notNull(),
  isPreset: integer("is_preset", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index("companions_user_id_idx").on(table.userId),
}));

export const worlds = sqliteTable("worlds", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  narrativeMd: text("narrative_md").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index("worlds_user_id_idx").on(table.userId),
}));

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  companionId: text("companion_id").notNull().references(() => companions.id),
  worldId: text("world_id").references(() => worlds.id),
  title: text("title"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  mode: text("mode", { enum: ["progressive", "aggressive", "exercise"] }).notNull().default("progressive"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdStatusIdx: index("conversations_user_status_idx").on(table.userId, table.status),
  updatedAtIdx: index("conversations_updated_at_idx").on(table.updatedAt),
}));

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  companionId: text("companion_id").references(() => companions.id),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  conversationIdIdx: index("messages_conv_id_idx").on(table.conversationId),
}));

export const textbooks = sqliteTable("textbooks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  parsedContent: text("parsed_content"),
  blobUrl: text("blob_url"),
  chapterCount: integer("chapter_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const diaryEntries = sqliteTable("diary_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  contentMd: text("content_md").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const flashcards = sqliteTable("flashcards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  front: text("front").notNull(),
  back: text("back").notNull(),
  deckName: text("deck_name").notNull().default("default"),
  reviewCount: integer("review_count").notNull().default(0),
  lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  textbookId: text("textbook_id").notNull().references(() => textbooks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  topic: text("topic"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  baseUrl: text("base_url"),
  model: text("model"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
