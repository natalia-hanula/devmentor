import { safeNextPath } from "@devmentor/core/http/safe-next-path";

/** Zamknięta lista komunikatów `/login?notice=` (L04, L07) — inne wartości strona ignoruje. */
export const LOGIN_NOTICES = {
  logged_out: "Wylogowano",
  session_expired: "Sesja wygasła — zaloguj się ponownie",
} as const;

export type LoginNotice = keyof typeof LOGIN_NOTICES;

export interface LoginPathParams {
  /** Dokąd wrócić po zalogowaniu — zawsze przechodzi przez `safeNextPath`. */
  next?: string;
  notice?: LoginNotice;
}

/** Adres strony logowania z bezpiecznym `next` i komunikatem z listy. */
export function loginPath({ next, notice }: LoginPathParams): string {
  const query = new URLSearchParams();
  if (next !== undefined) {
    query.set("next", safeNextPath(next));
  }
  if (notice !== undefined) {
    query.set("notice", notice);
  }
  return `/login?${query.toString()}`;
}

/** Tekst komunikatu dla wartości `?notice=`; spoza listy (także `__proto__` itp.) → `null`. */
export function loginNoticeText(value: string | undefined): string | null {
  return value !== undefined && Object.hasOwn(LOGIN_NOTICES, value) ? LOGIN_NOTICES[value as LoginNotice] : null;
}
