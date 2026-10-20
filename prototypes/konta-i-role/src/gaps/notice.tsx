import type { ReactNode } from "react";
import { cn } from "cn";

// LUKA DS02: design system nie ma komponentu Alert/baner. Najprostsza wersja z tokenów:
// info i ostrzeżenie na `muted` (brak tokenów stanu — DS16), błąd jak ErrorMessage, sukces na `primary`.
type Tone = "info" | "warning" | "error" | "success";

const TONES: Record<Tone, string> = {
  info: "border-border bg-muted",
  warning: "border-input border-l-4 bg-muted",
  error: "border-destructive/40 bg-destructive/5",
  success: "border-primary/40 bg-primary/5",
};

export interface NoticeProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-col gap-in-group rounded-md border px-between-groups py-in-group text-body", TONES[tone], className)}
    >
      {title && <p className={cn("font-medium", tone === "error" && "text-destructive")}>{title}</p>}
      {children && <div className="text-muted-foreground">{children}</div>}
      {action && <div className="flex flex-wrap gap-in-group">{action}</div>}
    </div>
  );
}
