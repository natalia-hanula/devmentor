import { User } from "@devmentor/db";
import { withScope } from "../container/container";
import type { Role, Session } from "./auth";
import { SESSION_COOKIE_NAME } from "./session-constants";

/**
 * Odczyt sesji z żądania (fail closed): brak ciasteczka, zły lub wygasły token, nieistniejące konto
 * albo inna wersja sesji dają `null`. Błąd bazy leci dalej (`apiHandler` zamienia go na 503) —
 * nigdy nie jest traktowany jako „zalogowany”.
 */
export async function getSession(request: Request): Promise<Session | null> {
  return getSessionFromCookieValue(readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME));
}

/** Wspólny rdzeń dla tras (ciasteczko z nagłówka) i stron (`cookies()` z `next/headers`). */
export async function getSessionFromCookieValue(value: string | null | undefined): Promise<Session | null> {
  if (!value) {
    return null;
  }
  return withScope(async ({ sessionTokenService, em }) => {
    const token = await sessionTokenService.verify(value);
    if (!token) {
      return null;
    }
    const user = await em.findOne(User, { id: token.userId }, { populate: ["roles"] });
    if (!user || user.sessionVersion !== token.sessionVersion) {
      return null;
    }
    return {
      userId: user.id,
      roles: user.roles.getItems().map((entry): Role => entry.role),
      emailVerified: user.emailVerifiedAt !== null,
    };
  });
}

function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}
