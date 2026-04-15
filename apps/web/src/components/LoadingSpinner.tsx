export function LoadingSpinner() {
  return (
    <div role="status" className="flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
