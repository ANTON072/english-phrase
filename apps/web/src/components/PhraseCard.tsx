import type { PhraseResponse } from "@english-phrase/types";
import { Loader2, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/useVoice";
import { parsePartOfSpeech } from "@/lib/utils";

type Props = {
  phrase: PhraseResponse;
  showAnswer: boolean;
  onAnswer: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export function PhraseCard({ phrase, showAnswer, onAnswer, onNext, onFinish }: Props) {
  const { voiceState, play } = useVoice(phrase.id, phrase.word);
  const partOfSpeeches = parsePartOfSpeech(phrase.partOfSpeech);
  const examples = phrase.example ? phrase.example.split("\n") : [];

  return (
    <div className="flex flex-col min-h-screen pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex items-center gap-3">
          <h2 className="text-5xl font-bold tracking-tight text-foreground">{phrase.word}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={play}
            disabled={voiceState !== "idle"}
            aria-label="Play pronunciation"
          >
            {voiceState === "loading" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Volume2 className={voiceState === "playing" ? "text-primary" : ""} />
            )}
          </Button>
        </div>

        {showAnswer && (
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
        )}
      </div>

      <div className="flex w-full gap-3 px-6 pb-6">
        {showAnswer ? (
          <>
            <Button size="lg" variant="outline" className="flex-1 h-14 text-base" onClick={onFinish}>
              Finish
            </Button>
            <Button size="lg" className="flex-1 h-14 text-base" onClick={onNext}>
              Next
            </Button>
          </>
        ) : (
          <Button size="lg" className="w-full h-14 text-base" onClick={onAnswer}>
            Answer
          </Button>
        )}
      </div>
    </div>
  );
}
