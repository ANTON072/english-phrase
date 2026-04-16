import { Hono } from "hono";
import { buildCacheKey, MODEL, textHash, VOICE } from "../speech-cache";

type Bindings = {
  OPENAI_API_KEY: string;
  VOICE_CACHE: R2Bucket;
};

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const MAX_TEXT_LENGTH = 500;

export const speechRoute = new Hono<{ Bindings: Bindings }>();

speechRoute.post("/speech", async (c) => {
  let body: { phraseId?: unknown; text?: unknown };
  try {
    const parsed = await c.req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    body = parsed as { phraseId?: unknown; text?: unknown };
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.phraseId !== "number") {
    return c.json({ error: "phraseId must be a number" }, 400);
  }

  if (typeof body.text !== "string" || body.text.trim() === "") {
    return c.json({ error: "text is required" }, 400);
  }

  if (body.text.length > MAX_TEXT_LENGTH) {
    return c.json({ error: `text must be ${MAX_TEXT_LENGTH} characters or less` }, 400);
  }

  const hash = await textHash(body.text);
  const key = buildCacheKey(body.phraseId, hash);

  // R2にキャッシュ済みのmp3があればOpenAIを呼ばずに返す
  const cached = await c.env.VOICE_CACHE.get(key);
  if (cached !== null) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  }

  // キャッシュなし: OpenAI TTS APIで音声を生成する
  let openaiRes: Response;
  try {
    openaiRes = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input: body.text,
        instructions: "Speak clearly at a natural pace for English learners.",
        response_format: "mp3",
      }),
    });
  } catch {
    return c.json({ error: "Failed to generate speech" }, 502);
  }

  if (!openaiRes.ok) {
    return c.json({ error: "Failed to generate speech" }, 502);
  }

  const mp3 = await openaiRes.arrayBuffer();

  // 生成したmp3をR2に保存して次回以降キャッシュから返せるようにする
  await c.env.VOICE_CACHE.put(key, mp3, {
    httpMetadata: { contentType: "audio/mpeg" },
  });

  return new Response(mp3, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
});
