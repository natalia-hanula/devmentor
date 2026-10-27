"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { Button } from "@devmentor/ui/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDenied } from "../../_lib/access-denied";
import { loginPath } from "../../_lib/login-path";
import { ROLE_START_PATHS } from "../../_lib/role-start-path";
import { useSessionExpiredRedirect } from "../../_lib/use-session-expired-redirect";
import { Notice } from "../notice";

const ME_PATH = "/api/auth/me";
const ACCEPT_PATH = "/api/auth/invitations/accept";
/** Klucz w `sessionStorage`: token przetrwa rejestrację i logowanie w tej karcie, nie trafia do adresu ani `next`. */
export const INVITE_TOKEN_STORAGE_KEY = "devmentor.invite-token";
/** Kody błędów z `@devmentor/core` (kopie — kod przeglądarki nie importuje głównego `core`). */
const UNAUTHORIZED_CODE = "UNAUTHORIZED";
const FORBIDDEN_CODE = "FORBIDDEN";
const VALIDATION_ERROR_CODE = "VALIDATION_ERROR";

export const INVALID_LINK_TEXT = "Link jest nieważny albo wygasł";
export const GUEST_TEXT = "Masz zaproszenie do roli mentora w DevMentor. Zaloguj się lub załóż konto, aby je przyjąć.";
export const INVALID_INVITATION_TEXT = "Zaproszenie jest nieważne";
export const INVALID_INVITATION_HINT = "Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.";
export const OPERATOR_DENIED_TEXT = "Zaproszenia przyjmuje konto mentora, nie operatora.";
export const ALREADY_MENTOR_TEXT = "Masz już rolę mentora";

/** Pola `AccountDto` potrzebne stronie (kopia — kod przeglądarki nie importuje `core`). */
interface Account {
  roles: string[];
}

interface Accepted {
  alreadyMentor: boolean;
}

/** Stany s08 po załadowaniu (ładowanie to brak wyniku). */
type State =
  | { kind: "no-token" } // s08.8
  | { kind: "guest" } // s08.1
  | { kind: "ready"; account: Account } // s08.2
  | { kind: "accepting" } // s08.3
  | { kind: "already-mentor" } // s08.5
  | { kind: "invalid" } // s08.6
  | { kind: "denied"; roles: string[] } // s08.7
  | { kind: "failed"; message: string; account: Account | null }; // s08.9 (429, 503)

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token);
  } catch {
    // `sessionStorage` niedostępny (np. tryb prywatny): token zostaje w pamięci komponentu, ale nie przetrwa rejestracji.
  }
}

function clearStoredToken(): void {
  try {
    window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
  } catch {
    // Nic do wyczyszczenia.
  }
}

/**
 * Token z fragmentu (`#token=`): zapis w `sessionStorage` i natychmiastowe wyczyszczenie fragmentu z paska adresu
 * i historii. Bez tokenu we fragmencie (powrót z logowania, odświeżenie) czytamy go z `sessionStorage`.
 */
function takeToken(): string | null {
  const { href, hash, pathname, search } = window.location;
  // `href`, nie `hash`: przy samym „#” `hash` jest pusty, a znak i tak zostałby w adresie.
  if (href.includes("#")) {
    window.history.replaceState(null, "", `${pathname}${search}`);
  }
  const fromHash = new URLSearchParams(hash.slice(1)).get("token") || null;
  if (fromHash !== null) {
    storeToken(fromHash);
    return fromHash;
  }
  return readStoredToken();
}

/** Sesja (`/api/auth/me`, 401 = gość) wybiera stan: gość, operator (brak dostępu) albo gotowość do przyjęcia. */
async function loadState(): Promise<State> {
  const me = await apiCall<Account>(ME_PATH);
  if (me.ok) {
    return me.data.roles.includes("operator") ? denied(me.data.roles) : { kind: "ready", account: me.data };
  }
  return me.error.code === UNAUTHORIZED_CODE ? { kind: "guest" } : { kind: "failed", message: me.error.message, account: null };
}

/** Operator nie przyjmie zaproszenia, więc token nie ma po co zostawać w `sessionStorage`. */
function denied(roles: string[]): State {
  clearStoredToken();
  return { kind: "denied", roles };
}

export function InviteView() {
  const router = useRouter();
  const redirectIfUnauthorized = useSessionExpiredRedirect();
  const token = useRef<string | null>(null);
  // Jedno odczytanie fragmentu na wejście: w Strict Mode efekt uruchamia się dwa razy z rzędu, a drugi przebieg
  // nie zobaczyłby już fragmentu — korzysta z tej samej, jeszcze nierozstrzygniętej obietnicy. Rozstrzygnięty
  // wynik nie jest używany ponownie: Next (`cacheComponents`) trzyma odwiedzone strony w pamięci i po powrocie
  // (np. z rejestracji) uruchamia efekt na nowo, a stary stan „gość” byłby nieprawdziwy.
  const loading = useRef<{ promise: Promise<State>; settled: boolean } | null>(null);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let active = true;
    if (loading.current === null || loading.current.settled) {
      const reloading = loading.current !== null;
      token.current = takeToken();
      const entry = { promise: token.current === null ? Promise.resolve<State>({ kind: "no-token" }) : loadState(), settled: false };
      entry.promise.then(() => {
        entry.settled = true;
      });
      loading.current = entry;
      if (reloading) {
        setState(null);
      }
    }
    loading.current.promise.then((loaded) => {
      if (active) {
        setState(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const accept = useCallback(
    async (account: Account) => {
      setState({ kind: "accepting" });
      const result = await apiCall<Accepted>(ACCEPT_PATH, { method: "POST", body: { token: token.current } });
      if (redirectIfUnauthorized(result)) {
        return;
      }
      if (result.ok) {
        clearStoredToken();
        if (result.data.alreadyMentor) {
          setState({ kind: "already-mentor" });
        } else {
          router.replace(ROLE_START_PATHS.mentor);
        }
        return;
      }
      if (result.error.code === VALIDATION_ERROR_CODE) {
        clearStoredToken();
        setState({ kind: "invalid" });
      } else if (result.error.code === FORBIDDEN_CODE) {
        setState(denied(account.roles));
      } else {
        setState({ kind: "failed", message: result.error.message, account });
      }
    },
    [redirectIfUnauthorized, router],
  );

  const retry = useCallback(async () => {
    setState(null);
    setState(await loadState());
  }, []);

  if (state === null) {
    return <LoadingMessage label="Sprawdzanie zaproszenia…" />;
  }
  switch (state.kind) {
    case "no-token":
      return <ErrorMessage title={INVALID_LINK_TEXT} message="Otwórz link z wiadomości jeszcze raz." />;
    case "guest":
      return (
        <>
          <Notice>{GUEST_TEXT}</Notice>
          <div className="flex flex-wrap items-center gap-between-groups">
            <Button asChild>
              <Link href={loginPath({ next: "/invite" })}>Zaloguj się</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/register?${new URLSearchParams({ next: "/invite" }).toString()}`}>Załóż konto</Link>
            </Button>
          </div>
        </>
      );
    case "ready":
      return (
        <Button className="self-start" onClick={() => accept(state.account)}>
          Przyjmij zaproszenie
        </Button>
      );
    case "accepting":
      return <LoadingMessage label="Przyjmowanie zaproszenia…" />;
    case "already-mentor":
      return (
        <>
          <Notice tone="success">{ALREADY_MENTOR_TEXT}</Notice>
          <Button asChild className="self-start">
            <Link href={ROLE_START_PATHS.mentor}>Przejdź do panelu mentora</Link>
          </Button>
        </>
      );
    case "invalid":
      return <ErrorMessage title={INVALID_INVITATION_TEXT} message={INVALID_INVITATION_HINT} />;
    case "denied":
      return <AccessDenied message={OPERATOR_DENIED_TEXT} roles={state.roles} />;
    case "failed": {
      const { account } = state;
      return (
        <ErrorMessage
          title="Nie udało się sprawdzić zaproszenia"
          message={state.message}
          onRetry={account ? () => accept(account) : retry}
        />
      );
    }
  }
}
