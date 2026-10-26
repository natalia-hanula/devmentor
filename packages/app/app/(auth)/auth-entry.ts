import { getSessionFromCookieValue, SESSION_COOKIE_NAME } from "@devmentor/core";
import { safeNextPath } from "@devmentor/core/http/safe-next-path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { roleStartPath } from "../_lib/role-start-path";

/** Strona, na którą wraca osoba z linku zaproszenia (L08) — sam token nigdy nie trafia do `next`. */
export const INVITE_PATH = "/invite";
export const INVITE_CONTEXT = "Po zalogowaniu przyjmiesz zaproszenie do roli mentora.";

export type SearchParams = Record<string, string | string[] | undefined>;

/** Pojedynczy parametr zapytania; powtórzony (`?next=a&next=b`) traktujemy jak brak. */
export function searchParam(params: SearchParams, name: string): string | undefined {
  const value = params[name];
  return typeof value === "string" ? value : undefined;
}

/** `next` po `safeNextPath` (złośliwy → `/`) albo `undefined`, gdy go nie podano (wtedy strona startowa roli). */
export function readNext(params: SearchParams): string | undefined {
  const next = searchParam(params, "next");
  return next === undefined ? undefined : safeNextPath(next);
}

/** Adres strony logowania/rejestracji z przeniesionym bezpiecznym `next`. */
export function withNext(path: "/login" | "/register", next: string | undefined): string {
  return next === undefined ? path : `${path}?${new URLSearchParams({ next }).toString()}`;
}

/**
 * Wejście na `/login` lub `/register` (L05): zalogowana osoba nie widzi formularza — trafia na bezpieczny
 * `next`, a bez niego na stronę startową roli. Nieważna sesja (ciasteczko bez sesji) pokazuje formularz.
 * Czyta ciasteczka i bazę, więc wołający jest pod `<Suspense>` (`cacheComponents`).
 */
export async function redirectSignedIn(next: string | undefined): Promise<void> {
  await connection();
  const session = await getSessionFromCookieValue((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (session) {
    redirect(next ?? roleStartPath(session.roles));
  }
}
