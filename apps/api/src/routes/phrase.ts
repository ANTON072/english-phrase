import { phrases } from "@english-phrase/db";
import type { ErrorResponse, PhraseResponse } from "@english-phrase/types";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

type Bindings = { DB: D1Database };

const phraseSelect = {
  id: phrases.id,
  word: phrases.word,
  meaning: phrases.meaning,
  partOfSpeech: phrases.partOfSpeech,
  example: phrases.example,
  exampleTranslation: phrases.exampleTranslation,
  notionCreatedAt: phrases.notionCreatedAt,
  starred: phrases.starred,
};

export const phraseRoute = new Hono<{ Bindings: Bindings }>();

phraseRoute.post("/phrase", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select(phraseSelect).from(phrases).orderBy(sql`RANDOM() * (CASE WHEN ${phrases.starred} = 1 THEN 0.1 ELSE 1.0 END)`).limit(1);
  if (result.length === 0) return c.json<ErrorResponse>({ error: "No phrases found" }, 404);
  return c.json<PhraseResponse>(result[0]);
});
