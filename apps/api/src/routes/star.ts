import { phrases } from "@english-phrase/db";
import type { ErrorResponse, StarRequest } from "@english-phrase/types";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

type Bindings = { DB: D1Database };

type ParseResult = ({ ok: true } & StarRequest) | { ok: false; error: string };

function parseBody(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid JSON body" };
  }
  const { phraseId, starred } = raw as Record<string, unknown>;
  if (typeof phraseId !== "number") return { ok: false, error: "phraseId must be a number" };
  if (typeof starred !== "boolean") return { ok: false, error: "starred must be a boolean" };
  return { ok: true, phraseId, starred };
}

export const starRoute = new Hono<{ Bindings: Bindings }>();

starRoute.post("/star", async (c) => {
  const parsed = parseBody(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json<ErrorResponse>({ error: parsed.error }, 400);

  const db = drizzle(c.env.DB);
  const result = await db
    .update(phrases)
    .set({ starred: parsed.starred ? 1 : 0 })
    .where(eq(phrases.id, parsed.phraseId))
    .returning({ id: phrases.id });

  if (result.length === 0) return c.json<ErrorResponse>({ error: "Phrase not found" }, 404);

  return c.json({ ok: true });
});
