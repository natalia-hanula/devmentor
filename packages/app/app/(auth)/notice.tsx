import type { ReactNode } from "react";

/** Odcienie banera z tokenów (DS nie ma tokenów stanu — luka DS16 z prototypu). */
const TONE_CLASSES = {
  info: "border-border bg-muted",
  success: "border-primary/40 bg-primary/5",
} as const;

export interface NoticeProps {
  tone?: keyof typeof TONE_CLASSES;
  children: ReactNode;
}

/** Baner informacyjny (luka DS02 — DS nie ma `Alert`): komunikat bez akcji, ogłaszany jako `status`. */
export function Notice({ tone = "info", children }: NoticeProps) {
  return (
    <p role="status" className={`rounded-md border px-between-groups py-in-group text-body ${TONE_CLASSES[tone]}`}>
      {children}
    </p>
  );
}
