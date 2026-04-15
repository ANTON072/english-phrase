import { HttpResponse, http } from "msw";
import { API_ENDPOINT } from "@/constants";
import type { Phrase } from "@/types";

const mockPhrases: Phrase[] = [
  {
    id: 293,
    word: "clerk",
    meaning: "店員",
    partOfSpeech: '["名詞"]',
    example:
      "1. The clerk at the grocery store helped me find the ingredients I needed.\n2. I asked the clerk for assistance with my purchase at the electronics shop.\n3. The friendly clerk greeted every customer with a smile as they walked in",
    exampleTranslation:
      "例文: 1. 食料品店の店員が必要な材料を見つけるのを手伝ってくれました。\n\n2. 電子機器店で購入について店員に助けを求めました。\n\n3. フレンドリーな店員は、入店するすべての顧客に笑顔で挨拶しました。",
    notionCreatedAt: "2026-03-29T14:56:00.000Z",
  },
  {
    id: 366,
    word: "Certainly",
    meaning: "確かに",
    partOfSpeech: '["副詞"]',
    example:
      '1. "Certainly, I will help you with your project this weekend."\n2. "She certainly has a talent for painting."\n3. "If you need assistance, I can certainly provide it."\n4. "He certainly made a great impression at the interview."\n5. "We will certainly meet our deadline if we stay on track."',
    exampleTranslation: null,
    notionCreatedAt: "2026-03-30T13:38:00.000Z",
  },
  {
    id: 402,
    word: "Neighborhood",
    meaning: "地域",
    partOfSpeech: '["名詞"]',
    example:
      "In my neighborhood, there are many parks where children can play and families can gather.",
    exampleTranslation: null,
    notionCreatedAt: "2026-04-02T13:03:00.000Z",
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
