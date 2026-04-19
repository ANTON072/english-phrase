import type { PhraseResponse } from "@english-phrase/types";
import { PhraseCard } from "@/components/PhraseCard";
import type { PageState } from "@/types";

type Props = {
  phrase: PhraseResponse;
  pageState: PageState;
  onAnswer: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export function QuizCard({ phrase, pageState, onAnswer, onNext, onFinish }: Props) {
  return (
    <PhraseCard
      phrase={phrase}
      showAnswer={pageState === "answer"}
      onAnswer={onAnswer}
      onNext={onNext}
      onFinish={onFinish}
    />
  );
}
