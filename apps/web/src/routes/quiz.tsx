import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/constants";
import { addReviewed, isStarted, type PhraseRecord } from "@/lib/session";
import type { PageState, Phrase } from "./types";

export const Route = createFileRoute("/quiz")({
  beforeLoad: () => {
    if (!isStarted()) {
      throw redirect({ to: "/" });
    }
  },
  component: QuizPage,
});

async function fetchPhrase(): Promise<Phrase> {
  const res = await fetch(API_ENDPOINT, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch phrase");
  return res.json() as Promise<Phrase>;
}

function QuizPage() {
  const navigate = useNavigate();
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const prevIdRef = useRef<number | null>(null);

  const loadPhrase = useCallback(async () => {
    setPageState("loading");
    setError(null);
    try {
      let next = await fetchPhrase();
      if (prevIdRef.current !== null && next.id === prevIdRef.current) {
        next = await fetchPhrase();
      }
      prevIdRef.current = next.id;
      setPhrase(next);
      setPageState("question");
    } catch {
      setError("Failed to load phrase. Please try again.");
      setPageState("question");
    }
  }, []);

  useEffect(() => {
    loadPhrase();
  }, [loadPhrase]);

  function handleAnswer() {
    setPageState("answer");
    if (phrase) {
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
    loadPhrase();
  }

  function handleFinish() {
    navigate({ to: "/result" });
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm font-medium text-muted-foreground">
          Count: {count}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {pageState === "loading" && (
          <p className="text-muted-foreground">Loading...</p>
        )}

        {pageState !== "loading" && error && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadPhrase}>Retry</Button>
          </div>
        )}

        {pageState !== "loading" && !error && phrase && (
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
                <Button size="lg" className="w-full text-base" onClick={handleAnswer}>
                  Answer
                </Button>
              )}

              {pageState === "answer" && (
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 text-base"
                    onClick={handleFinish}
                  >
                    Finish
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 text-base"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
