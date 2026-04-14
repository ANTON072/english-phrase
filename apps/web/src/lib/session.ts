import type { Phrase } from "@english-phrase/db";

export type PhraseRecord = Pick<
  Phrase,
  "id" | "word" | "meaning" | "partOfSpeech" | "example"
>;

// Module-level state — cleared on page reload, which resets to home
const session = {
  started: false,
  reviewedPhrases: [] as PhraseRecord[],
};

export function startSession(): void {
  session.started = true;
  session.reviewedPhrases = [];
}

export function isStarted(): boolean {
  return session.started;
}

export function addReviewed(phrase: PhraseRecord): void {
  session.reviewedPhrases.push(phrase);
}

export function getReviewed(): PhraseRecord[] {
  return [...session.reviewedPhrases];
}
