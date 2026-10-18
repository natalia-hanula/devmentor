import { cn } from "cn";

export interface LoadingMessageProps {
  label?: string;
  className?: string;
}

export function LoadingMessage({ label = "Ładowanie…", className }: LoadingMessageProps) {
  return (
    <p role="status" aria-live="polite" className={cn("text-sm text-muted-foreground", className)}>
      {label}
    </p>
  );
}
