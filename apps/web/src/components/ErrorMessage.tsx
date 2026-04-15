import { Button } from "@/components/ui/button";

type Props = {
  message: string;
  onRetry: () => void;
};

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-destructive">{message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}
