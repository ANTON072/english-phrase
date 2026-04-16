import type { PhraseResponse } from "@english-phrase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parsePartOfSpeech } from "@/lib/utils";

type Props = {
  phrase: PhraseResponse;
  onNext: () => void;
  onFinish: () => void;
};

export function AnswerCard({ phrase, onNext, onFinish }: Props) {
  const partOfSpeeches = parsePartOfSpeech(phrase.partOfSpeech);
  const examples = phrase.example ? phrase.example.split("\n") : [];

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-5xl font-bold tracking-tight text-foreground">{phrase.word}</h2>

        <div className="flex flex-col items-center gap-3">
          {partOfSpeeches.length > 0 && (
            <div className="flex gap-2">
              {partOfSpeeches.map((pos) => (
                <Badge key={pos} variant="secondary">
                  {pos}
                </Badge>
              ))}
            </div>
          )}
          {phrase.meaning && (
            <p className="text-2xl font-medium text-foreground">{phrase.meaning}</p>
          )}
          {examples.length > 0 && (
            <ol className="mt-2 text-left">
              {examples.map((ex, i) => (
                <li
                  key={ex}
                  className={`text-base text-muted-foreground italic py-2 ${i < examples.length - 1 ? "border-b border-border" : ""}`}
                >
                  {ex}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex gap-3">
          <Button size="lg" variant="outline" className="flex-1 text-base" onClick={onFinish}>
            Finish
          </Button>
          <Button size="lg" className="flex-1 text-base" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
