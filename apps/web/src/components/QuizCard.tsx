import type { PhraseResponse } from "@english-phrase/types";
import { Loader2, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/useVoice";
import { parsePartOfSpeech } from "@/lib/utils";
import type { PageState } from "@/types";

type Props = {
  phrase: PhraseResponse;
  pageState: PageState;
  onAnswer: () => void;
  onNext: () => void;
};

export function QuizCard({ phrase, pageState, onAnswer, onNext }: Props) {
  const { voiceState, play } = useVoice(phrase.id, phrase.word);
  const partOfSpeeches = parsePartOfSpeech(phrase.partOfSpeech);
  const examples = phrase.example ? phrase.example.split("\n") : [];
  const showAnswer = pageState === "answer";

  return (
    <div className="grid grid-rows-[1fr_auto] pt-safe pb-safe">
      <div className="grid place-content-center place-items-center gap-6 overflow-y-auto px-6 py-6 text-center">
        <div className="grid place-items-center gap-3">
          <h2 className="text-5xl font-bold tracking-tight text-foreground">{phrase.word}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={play}
            disabled={voiceState !== "idle"}
            aria-label="Play pronunciation"
            className="gap-1.5 text-muted-foreground"
          >
            {voiceState === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Volume2 className={`size-4 ${voiceState === "playing" ? "text-primary" : ""}`} />
            )}
          </Button>
        </div>

        <div className="grid place-items-center gap-3">
          {partOfSpeeches.length > 0 && (
            <div className="grid grid-flow-col gap-2">
              {partOfSpeeches.map((pos) => (
                <Badge key={pos} variant="secondary">
                  {pos}
                </Badge>
              ))}
            </div>
          )}
          {showAnswer && phrase.meaning && (
            <p className="text-2xl font-medium text-foreground">{phrase.meaning}</p>
          )}
          {showAnswer && examples.length > 0 && (
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

      <div className="grid px-6 pb-6">
        {showAnswer ? (
          <Button size="lg" className="h-14 text-base" onClick={onNext}>
            Next
          </Button>
        ) : (
          <Button size="lg" className="h-14 text-base" onClick={onAnswer}>
            Answer
          </Button>
        )}
      </div>
    </div>
  );
}
