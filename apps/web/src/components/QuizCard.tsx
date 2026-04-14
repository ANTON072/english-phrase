import { AnswerCard } from "@/components/AnswerCard";
import { QuestionCard } from "@/components/QuestionCard";
import type { PageState, Phrase } from "@/types";

type Props = {
  phrase: Phrase;
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
