import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PageState, Phrase } from "@/types";

type Props = {
  phrase: Phrase;
  pageState: PageState;
  onAnswer: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export function QuizCard({ phrase, pageState, onAnswer, onNext, onFinish }: Props) {
  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-5xl font-bold tracking-tight text-foreground">
          {phrase.word}
        </h2>

        {pageState === "answer" && (
          <div className="flex flex-col items-center gap-3">
            {phrase.partOfSpeech && (
              <Badge variant="secondary">{phrase.partOfSpeech}</Badge>
            )}
            {phrase.meaning && (
              <p className="text-2xl font-medium text-foreground">
                {phrase.meaning}
              </p>
            )}
            {phrase.example && (
              <p className="mt-2 text-base text-muted-foreground italic">
                {phrase.example}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-3">
        {pageState === "question" && (
          <Button size="lg" className="w-full text-base" onClick={onAnswer}>
            Answer
          </Button>
        )}

        {pageState === "answer" && (
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 text-base"
              onClick={onFinish}
            >
              Finish
            </Button>
            <Button
              size="lg"
              className="flex-1 text-base"
              onClick={onNext}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
