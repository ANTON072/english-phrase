import { describe, expect, it } from "vitest";
import { buildCacheKey, textHash } from "./speech";

describe("textHash", () => {
  it("同じテキストは同じハッシュを返す", async () => {
    const a = await textHash("run into");
    const b = await textHash("run into");
    expect(a).toBe(b);
  });

  it("異なるテキストは異なるハッシュを返す", async () => {
    const a = await textHash("run into");
    const b = await textHash("put off");
    expect(a).not.toBe(b);
  });

  it("64文字の16進文字列を返す (SHA-256)", async () => {
    const hash = await textHash("hello");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildCacheKey", () => {
  it("期待するパス形式でキーを返す", async () => {
    const hash = await textHash("run into");
    const key = buildCacheKey(123, hash);
    expect(key).toBe(`speech/gpt-4o-mini-tts/coral/123-${hash}.mp3`);
  });

  it("phraseId が違えば異なるキーになる", async () => {
    const hash = await textHash("run into");
    const key1 = buildCacheKey(1, hash);
    const key2 = buildCacheKey(2, hash);
    expect(key1).not.toBe(key2);
  });

  it("テキストが違えば異なるキーになる", async () => {
    const hash1 = await textHash("run into");
    const hash2 = await textHash("put off");
    const key1 = buildCacheKey(1, hash1);
    const key2 = buildCacheKey(1, hash2);
    expect(key1).not.toBe(key2);
  });
});
