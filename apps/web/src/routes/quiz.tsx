import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { QuizCard } from "@/components/QuizCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePhrase } from "@/hooks/usePhrase";
import { addReviewed, isStarted, type PhraseRecord } from "@/lib/session";
import type { PageState } from "@/types";

export const Route = createFileRoute("/quiz")({
  beforeLoad: () => {
    if (!isStarted()) {
      throw redirect({ to: "/" });
    }
  },
  component: QuizPage,
});

function QuizPage() {
  const navigate = useNavigate();
  const { phrase, loading, error, load } = usePhrase();
  const [pageState, setPageState] = useState<PageState>("question");
  const [count, setCount] = useState(0);

  function handleAnswer() {
    if (pageState !== "question") return;
    if (phrase) {
      setPageState("answer");
      const record: PhraseRecord = {
        id: phrase.id,
        word: phrase.word,
        meaning: phrase.meaning,
        partOfSpeech: phrase.partOfSpeech,
        example: phrase.example,
      };
      addReviewed(record);
      setCount((c) => c + 1);
    }
  }

  function handleNext() {
    setPageState("question");
    load();
  }

  function handleFinish() {
    navigate({ to: "/result" });
  }

  return (
    <main className="grid h-svh grid-rows-[auto_1fr]">
      <header className="grid grid-cols-[1fr_auto] items-center border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">Count: {count}</span>
        <Button variant="ghost" size="sm" onClick={handleFinish}>
          Finish
        </Button>
      </header>

      {loading && (
        <div className="grid place-items-center">
          <Spinner className="size-8" />
        </div>
      )}

      {!loading && error && (
        <div className="grid place-items-center">
          <ErrorMessage message={error} onRetry={load} />
        </div>
      )}

      {!loading && !error && phrase && (
        <div className="grid">
          <QuizCard
            phrase={phrase}
            pageState={pageState}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        </div>
      )}
    </main>
  );
}
