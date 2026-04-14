import { Button } from "@/components/ui/button";
import type { Phrase } from "@/types";

type Props = {
  phrase: Phrase;
  onAnswer: () => void;
};

export function QuestionCard({ phrase, onAnswer }: Props) {
  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-5xl font-bold tracking-tight text-foreground">
          {phrase.word}
        </h2>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button size="lg" className="w-full text-base" onClick={onAnswer}>
          Answer
        </Button>
      </div>
    </>
  );
}
