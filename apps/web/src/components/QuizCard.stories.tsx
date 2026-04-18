import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { PhraseResponse } from "@english-phrase/types";
import { QuizCard } from "./QuizCard";

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
  title: "Components/QuizCard",
  component: QuizCard,
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center gap-8 p-8 max-w-md mx-auto">
        <Story />
      </div>
    ),
  ],
  args: { onAnswer: fn(), onNext: fn(), onFinish: fn() },
} satisfies Meta<typeof QuizCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Question: Story = {
  args: {
    phrase: basePhrase,
    pageState: "question",
  },
};

export const Answer: Story = {
  args: {
    phrase: basePhrase,
    pageState: "answer",
  },
};
