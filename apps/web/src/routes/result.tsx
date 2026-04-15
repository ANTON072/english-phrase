import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getReviewed, isStarted } from "@/lib/session";

export const Route = createFileRoute("/result")({
  beforeLoad: () => {
    if (!isStarted()) {
      throw redirect({ to: "/" });
    }
  },
  component: ResultPage,
});

function ResultPage() {
  const navigate = useNavigate();
  const reviewed = getReviewed();

  function handleRestart() {
    navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <header className="flex flex-col gap-1 border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Today's Results</h1>
        <p className="text-sm text-muted-foreground">
          {reviewed.length} {reviewed.length === 1 ? "word" : "words"} reviewed
        </p>
      </header>

      <div className="mt-4 flex flex-1 flex-col gap-0">
        {reviewed.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No words reviewed yet.
          </p>
        ) : (
          reviewed.map((phrase) => (
            <div
              key={phrase.reviewId}
              className="flex flex-col gap-1 border-b border-border py-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{phrase.word}</span>
                {phrase.partOfSpeech && (
                  <Badge variant="secondary" className="text-xs">
                    {phrase.partOfSpeech}
                  </Badge>
                )}
              </div>
              {phrase.meaning && (
                <p className="text-sm text-muted-foreground">{phrase.meaning}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pt-6">
        <Button size="lg" className="w-full text-base" onClick={handleRestart}>
          Start Again
        </Button>
      </div>
    </main>
  );
}
