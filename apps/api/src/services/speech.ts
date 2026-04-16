const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
export const MODEL = "gpt-4o-mini-tts";
export const VOICE = "coral";

// テキストをSHA-256でハッシュ化して16進文字列で返す。
// R2キャッシュキーの一部として使い、テキスト内容が変わったら別キャッシュになるようにする。
export async function textHash(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// R2のオブジェクトキーを生成する。
// model・voice・phraseId・テキストが1つでも変われば別キャッシュになる。
export function buildCacheKey(phraseId: number, hash: string): string {
  return `speech/${MODEL}/${VOICE}/${phraseId}-${hash}.mp3`;
}

// キャッシュ済みmp3があればそれを返し、なければOpenAIで生成してR2に保存してから返す。
export async function getOrGenerate(
  phraseId: number,
  text: string,
  apiKey: string,
  cache: R2Bucket
): Promise<ArrayBuffer | null> {
  const key = buildCacheKey(phraseId, await textHash(text));

  const cached = await cache.get(key);
  if (cached) return cached.arrayBuffer();

  const res = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      instructions: "Speak clearly at a natural pace for English learners.",
      response_format: "mp3",
    }),
  }).catch(() => null);
  if (!res?.ok) return null;

  const mp3 = await res.arrayBuffer();
  // R2はキャッシュなので保存失敗は握りつぶし、生成済みのmp3はそのまま返す。
  await cache.put(key, mp3, { httpMetadata: { contentType: "audio/mpeg" } }).catch((err) => {
    console.error("[speech] R2 cache.put failed:", err);
  });
  return mp3;
}
