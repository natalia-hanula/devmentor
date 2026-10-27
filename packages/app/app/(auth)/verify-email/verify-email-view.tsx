"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { Button } from "@devmentor/ui/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loginPath } from "../../_lib/login-path";
import { roleStartPath } from "../../_lib/role-start-path";
import { Notice } from "../notice";
import { ResendVerification } from "../resend-verification";

const ME_PATH = "/api/auth/me";
const CONFIRM_PATH = "/api/auth/email-verification/confirm";
/** Kody błędów z `@devmentor/core` (kopie — kod przeglądarki nie importuje głównego `core`). */
const UNAUTHORIZED_CODE = "UNAUTHORIZED";
const VALIDATION_ERROR_CODE = "VALIDATION_ERROR";

export const INVALID_LINK_TEXT = "Link jest nieważny albo wygasł";

/** Pola `AccountDto` potrzebne stronie (kopia — kod przeglądarki nie importuje `core`). */
interface Account {
  email: string;
  roles: string[];
  emailVerified: boolean;
}

interface Confirmed {
  emailVerified: true;
  email: string;
}

/** Stany s05 po załadowaniu (s05.1 — ładowanie — to brak wyniku). */
type Outcome =
  | { kind: "confirmed"; account: Account | null } // s05.2
  | { kind: "confirmed-other"; email: string; account: Account } // s05.8
  | { kind: "already-verified"; account: Account } // s05.4
  | { kind: "invalid"; account: Account | null } // s05.3, s05.5
  | { kind: "failed"; message: string }; // s05.6 (429), s05.7 (503)

/**
 * Token z fragmentu (`#token=`) i natychmiastowe wyczyszczenie fragmentu z paska adresu i historii —
 * token nie zostaje w URL, zakładkach ani w `Referer`. Token żyje dalej tylko w pamięci komponentu.
 */
function takeTokenFromHash(): string | null {
  const { href, hash, pathname, search } = window.location;
  // `href`, nie `hash`: przy samym „#” `hash` jest pusty, a znak i tak zostałby w adresie.
  if (href.includes("#")) {
    window.history.replaceState(null, "", `${pathname}${search}`);
  }
  return new URLSearchParams(hash.slice(1)).get("token") || null;
}

/**
 * Token z linku idzie do potwierdzenia **zawsze**, niezależnie od sesji (L23); sesja (`/api/auth/me`, 401 = gość)
 * wybiera tylko komunikat i akcję. Bez tokenu: „już potwierdzony” wyłącznie dla zalogowanej osoby z potwierdzonym
 * adresem (dotyczy własnego konta, nic nie wycieka), pozostali — „Link jest nieważny albo wygasł” (L14).
 */
async function settle(token: string | null): Promise<Outcome> {
  const [me, confirmed] = await Promise.all([
    apiCall<Account>(ME_PATH),
    token === null ? null : apiCall<Confirmed>(CONFIRM_PATH, { method: "POST", body: { token } }),
  ]);
  const account = me.ok ? me.data : null;
  if (confirmed === null) {
    return withoutToken(me, account);
  }
  if (confirmed.ok) {
    return account && account.email !== confirmed.data.email
      ? { kind: "confirmed-other", email: confirmed.data.email, account }
      : { kind: "confirmed", account };
  }
  if (confirmed.error.code === VALIDATION_ERROR_CODE) {
    return { kind: "invalid", account };
  }
  return { kind: "failed", message: confirmed.error.message };
}

function withoutToken(me: ApiResult<Account>, account: Account | null): Outcome {
  if (!me.ok && me.error.code !== UNAUTHORIZED_CODE) {
    return { kind: "failed", message: me.error.message };
  }
  return account?.emailVerified ? { kind: "already-verified", account } : { kind: "invalid", account };
}

export function VerifyEmailView() {
  const token = useRef<string | null>(null);
  // Jedno potwierdzenie na wejście: w trybie Strict Mode efekt uruchamia się dwa razy, a drugi POST
  // z tym samym tokenem dostałby „Link jest nieważny” — drugi przebieg korzysta z tej samej obietnicy.
  const firstSettle = useRef<Promise<Outcome> | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    if (firstSettle.current === null) {
      token.current = takeTokenFromHash();
      firstSettle.current = settle(token.current);
    }
    firstSettle.current.then((settled) => {
      if (active) {
        setOutcome(settled);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const retry = useCallback(async () => {
    setOutcome(null);
    setOutcome(await settle(token.current));
  }, []);

  if (outcome === null) {
    return <LoadingMessage label="Potwierdzanie adresu…" />;
  }
  switch (outcome.kind) {
    case "confirmed":
      return (
        <>
          <Notice tone="success">Adres e-mail potwierdzony</Notice>
          {outcome.account ? <AccountLink account={outcome.account} /> : <LoginLink />}
        </>
      );
    case "confirmed-other":
      return (
        <>
          <Notice tone="success">
            Potwierdzono adres {outcome.email}. To inne konto niż to, które jest teraz zalogowane.
          </Notice>
          <AccountLink account={outcome.account} />
        </>
      );
    case "already-verified":
      return (
        <>
          <Notice tone="success">Twój adres jest już potwierdzony</Notice>
          <AccountLink account={outcome.account} />
        </>
      );
    case "invalid":
      return (
        <>
          <ErrorMessage title={INVALID_LINK_TEXT} message="Link działa jeden raz i jest ważny 24 h." />
          <InvalidLinkAction account={outcome.account} />
        </>
      );
    case "failed":
      return <ErrorMessage title="Nie udało się sprawdzić linku" message={outcome.message} onRetry={retry} />;
  }
}

/** L13 + OP-1: niepotwierdzony → nowy link; potwierdzony → konto; gość → logowanie z powrotem na `/account` (baner). */
function InvalidLinkAction({ account }: { account: Account | null }) {
  if (account === null) {
    return (
      // Luka DS21: Button ma `whitespace-nowrap` i stałą wysokość — długa etykieta wychodziłaby poza wąski ekran.
      <Button asChild variant="outline" className="h-auto self-start whitespace-normal">
        <Link href={loginPath({ next: "/account" })}>Zaloguj się, aby wysłać nowy link</Link>
      </Button>
    );
  }
  return account.emailVerified ? <AccountLink account={account} /> : <ResendVerification />;
}

function AccountLink({ account }: { account: Account }) {
  return (
    <Button asChild className="self-start">
      <Link href={roleStartPath(account.roles)}>Przejdź do konta</Link>
    </Button>
  );
}

function LoginLink() {
  return (
    <Button asChild className="self-start">
      <Link href="/login">Zaloguj się</Link>
    </Button>
  );
}
