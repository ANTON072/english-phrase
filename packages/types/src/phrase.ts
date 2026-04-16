export type PhraseResponse = {
  id: number;
  word: string;
  meaning: string | null;
  partOfSpeech: string | null;
  example: string | null;
  exampleTranslation: string | null;
  notionCreatedAt: string | null;
};
