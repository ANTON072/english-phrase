import { Hono } from "hono";

type Bindings = {
  OPENAI_API_KEY: string;
  VOICE_CACHE: R2Bucket;
};

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const MODEL = "gpt-4o-mini-tts";
const VOICE = "coral";
const MAX_TEXT_LENGTH = 500;

export const speechRoute = new Hono<{ Bindings: Bindings }>();

speechRoute.post("/speech", async (c) => {
  let body: { phraseId?: unknown; text?: unknown };
  try {
    body = await c.req.json();
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
    return c.json(
      { error: `text must be ${MAX_TEXT_LENGTH} characters or less` },
      400
    );
  }

  const openaiRes = await fetch(OPENAI_TTS_URL, {
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

  if (!openaiRes.ok) {
    return c.json({ error: "Failed to generate speech" }, 502);
  }

  const mp3 = await openaiRes.arrayBuffer();

  return new Response(mp3, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
});
