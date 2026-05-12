import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const phrases = sqliteTable("phrases", {
  id: int("id").primaryKey({ autoIncrement: true }),
  notionPageId: text("notion_page_id").notNull().unique(),
  word: text("word").notNull(),
  meaning: text("meaning"),
  partOfSpeech: text("part_of_speech"),
  example: text("example"),
  exampleTranslation: text("example_translation"),
  notionCreatedAt: text("notion_created_at"),
  syncedAt: text("synced_at").notNull().default(sql`(datetime('now'))`),
  starred: int("starred").notNull().default(0),
});

export const syncLogs = sqliteTable("sync_logs", {
  id: int("id").primaryKey({ autoIncrement: true }),
  syncedAt: text("synced_at").notNull(),
});

export type Phrase = Pick<
  typeof phrases.$inferSelect,
  "id" | "word" | "meaning" | "partOfSpeech" | "example" | "exampleTranslation" | "notionCreatedAt" | "starred"
>;

export type NewPhrase = typeof phrases.$inferInsert;
