import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">English Phrase</h1>
      <p className="mt-4 text-muted-foreground">英語フレーズ学習アプリ</p>
    </main>
  );
}
