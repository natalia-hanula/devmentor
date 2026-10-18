import { cn } from "cn";
import { Button } from "../../components/ui/button";

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ title = "Coś poszło nie tak", message, onRetry, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm",
        className,
      )}
    >
      <div>
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}
