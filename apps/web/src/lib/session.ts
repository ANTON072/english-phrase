import type { Phrase } from "@english-phrase/db";

export type PhraseRecord = Pick<Phrase, "id" | "word" | "meaning" | "partOfSpeech" | "example">;

// 結果画面での一覧表示用。同一フレーズが複数回登場しても key が衝突しないよう reviewId を付与する
export type ReviewedRecord = PhraseRecord & { reviewId: string };

// Module-level state — cleared on page reload, which resets to home
const session = {
  started: false,
  reviewedPhrases: [] as ReviewedRecord[],
};

export function startSession(): void {
  session.started = true;
  session.reviewedPhrases = [];
}

export function isStarted(): boolean {
  return session.started;
}

export function addReviewed(phrase: PhraseRecord): void {
  session.reviewedPhrases.push({ ...phrase, reviewId: crypto.randomUUID() });
}

export function getReviewed(): ReviewedRecord[] {
  return [...session.reviewedPhrases];
}
