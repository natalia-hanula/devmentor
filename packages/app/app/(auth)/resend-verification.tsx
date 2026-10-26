"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { Button } from "@devmentor/ui/components/ui/button";
import { useState } from "react";
import { useSessionExpiredRedirect } from "../_lib/use-session-expired-redirect";
import { Notice } from "./notice";

const RESEND_PATH = "/api/auth/email-verification/resend";

/** Propozycja tekstu potwierdzenia (L12) — do akceptacji. */
export const RESEND_SENT_TEXT = "Wysłaliśmy nowy link. Sprawdź skrzynkę.";

type ResendState = { status: "idle" | "sending" | "sent" } | { status: "failed"; message: string };

/**
 * „Wyślij ponownie” (s04.4, s05.3): nowy link weryfikacyjny dla zalogowanego konta. Po sukcesie potwierdzenie,
 * przy 429 i innych błędach komunikat z serwera; 401 → „Sesja wygasła” (decyzja 17). Na `/account` i `/verify-email`.
 */
export function ResendVerification() {
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const [state, setState] = useState<ResendState>({ status: "idle" });

  async function resend() {
    setState({ status: "sending" });
    const result = await apiCall<null>(RESEND_PATH, { method: "POST" });
    if (redirectIfUnauthorized(result)) {
      return;
    }
    setState(result.ok ? { status: "sent" } : { status: "failed", message: result.error.message });
  }

  return (
    <div className="flex flex-col items-start gap-in-group">
      <Button type="button" variant="outline" size="sm" onClick={resend} disabled={state.status === "sending"}>
        {state.status === "sending" ? "Wysyłanie…" : "Wyślij ponownie"}
      </Button>
      {state.status === "sent" && <Notice tone="success">{RESEND_SENT_TEXT}</Notice>}
      {state.status === "failed" && <ErrorMessage title="Nie udało się wysłać linku" message={state.message} />}
    </div>
  );
}
