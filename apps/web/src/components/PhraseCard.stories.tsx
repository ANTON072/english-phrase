import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { PhraseResponse } from "@english-phrase/types";
import { PhraseCard } from "./PhraseCard";

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
  title: "Components/PhraseCard",
  component: PhraseCard,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-svh flex-col overflow-hidden">
        <Story />
      </div>
    ),
  ],
  args: { onAnswer: fn(), onNext: fn(), onFinish: fn() },
} satisfies Meta<typeof PhraseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Question: Story = {
  args: {
    phrase: basePhrase,
    showAnswer: false,
  },
};

export const Answer: Story = {
  args: {
    phrase: basePhrase,
    showAnswer: true,
  },
};

export const MultiplePartsOfSpeech: Story = {
  args: {
    phrase: {
      ...basePhrase,
      word: "light",
      meaning: "光、明るい、軽い",
      partOfSpeech: '["noun", "adjective", "verb"]',
    },
    showAnswer: true,
  },
};

export const LongWord: Story = {
  args: {
    phrase: {
      ...basePhrase,
      word: "incomprehensibility",
    },
    showAnswer: false,
  },
};

export const NoExample: Story = {
  args: {
    phrase: {
      ...basePhrase,
      example: null,
    },
    showAnswer: true,
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
    showAnswer: true,
  },
};
