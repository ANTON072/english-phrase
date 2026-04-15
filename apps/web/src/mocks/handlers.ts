import { http, HttpResponse } from "msw";
import { API_ENDPOINT } from "@/constants";
import type { Phrase } from "@/types";

const mockPhrases: Phrase[] = [
  {
    id: 1,
    word: "break the ice",
    meaning: "緊張をほぐす、打ち解ける",
    partOfSpeech: "phrase",
    example: "He told a joke to break the ice at the meeting.",
    exampleTranslation: "彼は会議の場を和ませるためにジョークを言った。",
    notionCreatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    word: "hit the nail on the head",
    meaning: "的を射る、正確に指摘する",
    partOfSpeech: "phrase",
    example: "You hit the nail on the head with that analysis.",
    exampleTranslation: "あなたのその分析はまさに的を射ている。",
    notionCreatedAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: 3,
    word: "under the weather",
    meaning: "体調が悪い",
    partOfSpeech: "phrase",
    example: "I'm feeling a bit under the weather today.",
    exampleTranslation: "今日は少し体調が優れない。",
    notionCreatedAt: "2024-01-03T00:00:00.000Z",
  },
];

let lastIndex = -1;

export const handlers = [
  http.post(API_ENDPOINT, () => {
    let index: number;
    do {
      index = Math.floor(Math.random() * mockPhrases.length);
    } while (index === lastIndex && mockPhrases.length > 1);
    lastIndex = index;
    return HttpResponse.json(mockPhrases[index]);
  }),
];
