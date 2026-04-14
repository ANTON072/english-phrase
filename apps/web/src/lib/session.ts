export type PhraseRecord = {
  id: number;
  word: string;
  meaning: string | null;
  partOfSpeech: string | null;
  example: string | null;
};

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
