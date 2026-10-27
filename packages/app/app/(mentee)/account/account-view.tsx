"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "../../_lib/logout-button";
import { useSessionExpiredRedirect } from "../../_lib/use-session-expired-redirect";
import { VerificationBanner } from "../../(auth)/verification-banner";

/** Pola `AccountDto` z `@devmentor/core`, które pokazuje strona (kopia — kod przeglądarki nie importuje `core`). */
export interface Account {
  email: string;
  displayName: string;
  roles: string[];
  emailVerified: boolean;
}

const ME_PATH = "/api/auth/me";

export function AccountView() {
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const [result, setResult] = useState<ApiResult<Account> | null>(null);

  const show = useCallback(
    (loaded: ApiResult<Account>) => {
      // Przy 401 trwa przekierowanie na `/login` — zostajemy przy stanie ładowania zamiast mignąć błędem.
      if (!redirectIfUnauthorized(loaded)) {
        setResult(loaded);
      }
    },
    [redirectIfUnauthorized],
  );

  const reload = useCallback(async () => {
    setResult(null);
    show(await apiCall<Account>(ME_PATH));
  }, [show]);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<Account>(ME_PATH, { signal: controller.signal }).then((loaded) => {
      if (!controller.signal.aborted) {
        show(loaded);
      }
    });
    return () => controller.abort();
  }, [show]);

  return (
    <>
      {result === null && <LoadingMessage label="Ładowanie konta…" />}
      {result && !result.ok && (
        <ErrorMessage title="Nie udało się wczytać konta" message={result.error.message} onRetry={reload} />
      )}
      {result?.ok && !result.data.emailVerified && (
        <VerificationBanner message="Potwierdź adres e-mail — będzie potrzebny przed pierwszą rezerwacją" />
      )}
      {result?.ok && <AccountDetails account={result.data} />}
      <LogoutButton>Wyloguj</LogoutButton>
    </>
  );
}

function AccountDetails({ account }: { account: Account }) {
  return (
    <dl className="flex flex-col gap-between-groups">
      <Field label="E-mail">{account.email}</Field>
      <Field label="Wyświetlana nazwa">{account.displayName}</Field>
      <Field label="Role">
        <span className="flex flex-wrap gap-in-group">
          {account.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </span>
      </Field>
      <Field label="Status e-maila">
        {/* Luka DS10: Badge nie ma wariantów statusu — znaczenie niesie tekst. */}
        <Badge variant={account.emailVerified ? "default" : "outline"}>
          {account.emailVerified ? "potwierdzony" : "niepotwierdzony"}
        </Badge>
      </Field>
    </dl>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-list-row-gap">
      <dt className="text-meta text-muted-foreground">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}
