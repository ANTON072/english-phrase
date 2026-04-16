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
