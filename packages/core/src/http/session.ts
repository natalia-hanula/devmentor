import type { Session } from "./auth";

/**
 * Odczyt sesji z żądania. Koncepcja `auth` (JWT w ciasteczku httpOnly) nie jest jeszcze wdrożona,
 * więc sesji nie ma nigdy — każda chroniona trasa odpowiada 401 (fail closed).
 * Wdrożenie auth podmienia wyłącznie ciało tej funkcji.
 */
export async function getSession(request: Request): Promise<Session | null> {
  void request;
  return null;
}
