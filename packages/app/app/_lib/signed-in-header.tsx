"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "./logout-button";
import { NavLink } from "./nav-link";
import { ROLE_START_PATHS } from "./role-start-path";
import { useSessionExpiredRedirect } from "./use-session-expired-redirect";

/** Pola `AccountDto` potrzebne nagłówkowi (kopia — kod przeglądarki nie importuje głównego `core`). */
interface Account {
  displayName: string;
  roles: string[];
}

const ME_PATH = "/api/auth/me";
/** Panel operatora zaczyna się od zaproszeń (L03), ale pozycja jest aktywna na całym `/admin/*`. */
const OPERATOR_PANEL_PREFIX = "/admin";

/**
 * Nagłówek zalogowanego (e01, L21) na `/account`, `/mentor` i `/admin/*`: nazwa, `/account` dla każdego, `/mentor`
 * tylko dla mentora, panel operatora tylko dla operatora, „Wyloguj” (→ `/login`, „Wylogowano”, L04). Ukrycie
 * linku nie zastępuje bramek ról na serwerze — to wygoda, autorytetem jest strona (`PageRoleGate`) i API (403).
 * Do czasu odpowiedzi `/api/auth/me` (albo przy błędzie) pokazuje samą nazwę serwisu: layout nie skacze, a strona
 * pod nagłówkiem sama obsługuje błąd i wygasłą sesję.
 */
export function SignedInHeader() {
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const [result, setResult] = useState<ApiResult<Account> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<Account>(ME_PATH, { signal: controller.signal }).then((loaded) => {
      if (!controller.signal.aborted && !redirectIfUnauthorized(loaded)) {
        setResult(loaded);
      }
    });
    return () => controller.abort();
  }, [redirectIfUnauthorized]);

  const account = result?.ok ? result.data : null;
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-between-groups px-6 py-in-group">
        <Link href="/" className="font-semibold">
          DevMentor
        </Link>
        {account && (
          <>
            <nav aria-label="Konto" className="flex flex-wrap gap-between-groups text-body">
              <NavLink href={ROLE_START_PATHS.mentee}>Konto</NavLink>
              {account.roles.includes("mentor") && <NavLink href={ROLE_START_PATHS.mentor}>Panel mentora</NavLink>}
              {account.roles.includes("operator") && (
                <NavLink href={ROLE_START_PATHS.operator} activePrefix={OPERATOR_PANEL_PREFIX}>
                  Panel operatora
                </NavLink>
              )}
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-in-group">
              <span className="text-body">{account.displayName}</span>
              <LogoutButton>Wyloguj</LogoutButton>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
