import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { startSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  function handleStart() {
    startSession();
    navigate({ to: "/quiz" });
  }

  return (
    <main className="h-svh grid place-content-center place-items-center gap-10 px-6">
      <div className="grid gap-3 place-items-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">English Phrase</h1>
        <p className="text-lg text-muted-foreground">Let's get started!</p>
      </div>
      <Button size="lg" className="w-40 text-base" onClick={handleStart}>
        Start
      </Button>
    </main>
  );
}
