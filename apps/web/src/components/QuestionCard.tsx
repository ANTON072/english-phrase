import { Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/useVoice";
import type { Phrase } from "@/types";

type Props = {
  phrase: Phrase;
  onAnswer: () => void;
};

export function QuestionCard({ phrase, onAnswer }: Props) {
  const { voiceState, play } = useVoice(phrase.id, phrase.word);

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
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
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button size="lg" className="w-full text-base" onClick={onAnswer}>
          Answer
        </Button>
      </div>
    </>
  );
}
