import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { PhraseResponse } from "@english-phrase/types";
import { AnswerCard } from "./AnswerCard";

const basePhrase: PhraseResponse = {
  id: 1,
  word: "serendipity",
  meaning: "偶然の幸運な発見",
  partOfSpeech: '["noun"]',
  example:
    "It was pure serendipity that we met at the airport.\nThe discovery of penicillin was a happy serendipity.",
  exampleTranslation: null,
  notionCreatedAt: "2024-01-01T00:00:00.000Z",
};

const meta = {
  title: "Components/AnswerCard",
  component: AnswerCard,
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center gap-8 p-8 max-w-md mx-auto">
        <Story />
      </div>
    ),
  ],
  args: { onNext: fn(), onFinish: fn() },
} satisfies Meta<typeof AnswerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { phrase: basePhrase },
};

export const MultiplePartsOfSpeech: Story = {
  args: {
    phrase: {
      ...basePhrase,
      word: "light",
      meaning: "光、明るい、軽い",
      partOfSpeech: '["noun", "adjective", "verb"]',
      example: "The light in the room was dim.\nShe wore a light coat.",
    },
  },
};

export const NoExample: Story = {
  args: {
    phrase: {
      ...basePhrase,
      example: null,
    },
  },
};

export const NoMeaning: Story = {
  args: {
    phrase: {
      ...basePhrase,
      meaning: null,
      partOfSpeech: null,
      example: null,
    },
  },
};
