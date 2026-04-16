import type { ErrorResponse, SpeechRequest } from "@english-phrase/types";
import { Hono } from "hono";
import { getOrGenerate } from "../services/speech";

type Bindings = {
  OPENAI_API_KEY: string;
  VOICE_CACHE: R2Bucket;
};

const MAX_TEXT_LENGTH = 500;

// audio/mpeg レスポンスを生成するヘルパー
const mp3Response = (body: BodyInit) =>
  new Response(body, { headers: { "Content-Type": "audio/mpeg" } });

type ParseResult = ({ ok: true } & SpeechRequest) | { ok: false; error: string };

// リクエストbodyを検証し、Result型で返す。
function parseBody(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid JSON body" };
  }
  const { phraseId, text } = raw as Record<string, unknown>;
  if (typeof phraseId !== "number") return { ok: false, error: "phraseId must be a number" };
  if (typeof text !== "string" || text.trim() === "")
    return { ok: false, error: "text is required" };
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `text must be ${MAX_TEXT_LENGTH} characters or less` };
  }
  return { ok: true, phraseId, text };
}

export const speechRoute = new Hono<{ Bindings: Bindings }>();

// POST /api/v1/speech
// word の音声mp3を返す。R2にキャッシュ済みであればOpenAIを呼ばずに返す。
speechRoute.post("/speech", async (c) => {
  const parsed = parseBody(await c.req.json().catch(() => null));
  if (!parsed.ok) return c.json<ErrorResponse>({ error: parsed.error }, 400);

  // R2キャッシュまたはOpenAI生成でmp3を取得する
  const mp3 = await getOrGenerate(
    parsed.phraseId,
    parsed.text,
    c.env.OPENAI_API_KEY,
    c.env.VOICE_CACHE
  );
  if (!mp3) return c.json<ErrorResponse>({ error: "Failed to generate speech" }, 502);

  return mp3Response(mp3);
});
