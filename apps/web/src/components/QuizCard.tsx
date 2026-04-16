import type { PhraseResponse } from "@english-phrase/types";
import { AnswerCard } from "@/components/AnswerCard";
import { QuestionCard } from "@/components/QuestionCard";
import type { PageState } from "@/types";

type Props = {
  phrase: PhraseResponse;
  pageState: PageState;
  onAnswer: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export function QuizCard({ phrase, pageState, onAnswer, onNext, onFinish }: Props) {
  if (pageState === "question") {
    return <QuestionCard phrase={phrase} onAnswer={onAnswer} />;
  }

  return <AnswerCard phrase={phrase} onNext={onNext} onFinish={onFinish} />;
}
