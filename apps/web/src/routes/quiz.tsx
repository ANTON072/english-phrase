import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QuizCard } from "@/components/QuizCard";
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
    <main className="flex min-h-screen flex-col px-6 py-8">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm font-medium text-muted-foreground">Count: {count}</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {loading && <LoadingSpinner />}

        {!loading && error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && phrase && (
          <QuizCard
            phrase={phrase}
            pageState={pageState}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onFinish={handleFinish}
          />
        )}
      </div>
    </main>
  );
}
