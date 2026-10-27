"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { Button } from "@devmentor/ui/components/ui/button";
import { useState } from "react";
import { useSessionExpiredRedirect } from "../_lib/use-session-expired-redirect";
import { Notice } from "./notice";

const RESEND_PATH = "/api/auth/email-verification/resend";

/** Propozycje tekstów (L12) — do akceptacji. Jeden na wynik z serwera, żeby nie obiecywać maila, którego nie wysłano. */
export const RESEND_SENT_TEXT = "Wysłaliśmy nowy link. Sprawdź skrzynkę.";
export const RESEND_ALREADY_VERIFIED_TEXT = "Adres jest już potwierdzony.";
export const RESEND_MAIL_DISABLED_TEXT = "Wysyłka poczty jest wyłączona.";

type ResendStatus = "sent" | "already_verified" | "mail_disabled";

const RESULT_TEXT: Record<ResendStatus, string> = {
  sent: RESEND_SENT_TEXT,
  already_verified: RESEND_ALREADY_VERIFIED_TEXT,
  mail_disabled: RESEND_MAIL_DISABLED_TEXT,
};

type ResendState =
  | { status: "idle" | "sending" }
  | { status: "done"; result: ResendStatus }
  | { status: "failed"; message: string };

/**
 * „Wyślij ponownie” (s04.4, s05.3): nowy link weryfikacyjny dla zalogowanego konta. Po sukcesie komunikat zależny od wyniku z serwera,
 * przy 429 i innych błędach komunikat z serwera; 401 → „Sesja wygasła” (decyzja 17). Na `/account` i `/verify-email`.
 */
export function ResendVerification() {
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const [state, setState] = useState<ResendState>({ status: "idle" });

  async function resend() {
    setState({ status: "sending" });
    const result = await apiCall<{ status: ResendStatus }>(RESEND_PATH, { method: "POST" });
    if (redirectIfUnauthorized(result)) {
      return;
    }
    setState(result.ok ? { status: "done", result: result.data.status } : { status: "failed", message: result.error.message });
  }

  return (
    <div className="flex flex-col items-start gap-in-group">
      <Button type="button" variant="outline" size="sm" onClick={resend} disabled={state.status === "sending"}>
        {state.status === "sending" ? "Wysyłanie…" : "Wyślij ponownie"}
      </Button>
      {state.status === "done" && (
        <Notice tone={state.result === "sent" ? "success" : "info"}>{RESULT_TEXT[state.result]}</Notice>
      )}
      {state.status === "failed" && <ErrorMessage title="Nie udało się wysłać linku" message={state.message} />}
    </div>
  );
}
