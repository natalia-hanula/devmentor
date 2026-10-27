"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { useCallback, useEffect, useState } from "react";
import { useSessionExpiredRedirect } from "../../_lib/use-session-expired-redirect";
import { VerificationBanner } from "../../(auth)/verification-banner";

/** Pole `AccountDto`, które pokazuje strona (kopia — kod przeglądarki nie importuje `core`). */
interface Account {
  emailVerified: boolean;
}

const ME_PATH = "/api/auth/me";

/** s09.1–s09.2: powitanie mentora; profil, cena i terminy dochodzą w E02. Niepotwierdzony adres → baner (G7). */
export function MentorHome() {
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const [result, setResult] = useState<ApiResult<Account> | null>(null);

  const show = useCallback(
    (loaded: ApiResult<Account>) => {
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
      {result === null && <LoadingMessage label="Ładowanie panelu…" />}
      {result && !result.ok && (
        <ErrorMessage title="Nie udało się wczytać panelu" message={result.error.message} onRetry={reload} />
      )}
      {result?.ok && !result.data.emailVerified && (
        <VerificationBanner message="Potwierdź adres e-mail — bez tego nie opublikujesz profilu" />
      )}
      <p className="text-body">Masz rolę mentora. Profil, cena i terminy pojawią się tu w kolejnym etapie.</p>
    </>
  );
}
