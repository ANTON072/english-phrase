import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { PhraseResponse } from "@english-phrase/types";
import { QuestionCard } from "./QuestionCard";

const basePhrase: PhraseResponse = {
  id: 1,
  word: "serendipity",
  meaning: "偶然の幸運な発見",
  partOfSpeech: '["noun"]',
  example: "It was pure serendipity that we met at the airport.",
  exampleTranslation: null,
  notionCreatedAt: "2024-01-01T00:00:00.000Z",
};

const meta = {
  title: "Components/QuestionCard",
  component: QuestionCard,
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center gap-8 p-8 max-w-md mx-auto">
        <Story />
      </div>
    ),
  ],
  args: { onAnswer: fn() },
} satisfies Meta<typeof QuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { phrase: basePhrase },
};

export const LongWord: Story = {
  args: {
    phrase: {
      ...basePhrase,
      id: 2,
      word: "incomprehensibility",
    },
  },
};
