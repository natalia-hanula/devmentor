import { isDatabaseUnavailableError } from "@devmentor/db";
import { getLogger } from "../logger";
import { AppError, ServiceUnavailableError } from "./errors";
import { safeNextPath } from "./safe-next-path";
import { isDataWithCookies, type DataWithCookies, type RouteContext, type RouteHandler } from "./api-handler";

const UNEXPECTED_ERROR_CODE = "unexpected";
/** `HEAD` to `GET` bez ciała (RFC 9110 §9.3.2) — odpowiedź przekierowania i tak go nie ma. */
const ALLOWED_METHODS = ["GET", "HEAD"];

/**
 * Drugi kanoniczny wrapper tras obok `apiHandler`, dla tras, które odpowiadają przekierowaniem
 * (callback OAuth i każde przyszłe). Handler zwraca adres docelowy (ścieżkę względną) albo
 * `withCookies(adres, cookies)`; adres zawsze przechodzi przez `safeNextPath` (niebezpieczny → `/`),
 * więc handler przekazujący dalej wartość od użytkownika nie zrobi otwartego przekierowania.
 * Tylko `GET` i `HEAD` (obsługiwany jak `GET`) — te trasy nie zmieniają stanu poza sesją, więc nie
 * wymagają nagłówka CSRF; inne metody → 405. Błąd zamienia na `302 /login?error=<kod>`; nie
 * ujawnia stack trace'ów.
 * Loguje wyłącznie `pathname`: callback OAuth niesie w query `code` i `state`.
 */
export function redirectHandler(
  handler: (request: Request, context: RouteContext) => Promise<string | DataWithCookies<string>>,
): RouteHandler {
  return async (request, context) => {
    if (!ALLOWED_METHODS.includes(request.method)) {
      return new Response(null, { status: 405, headers: { allow: ALLOWED_METHODS.join(", ") } });
    }
    try {
      const result = await handler(request, context);
      return isDataWithCookies(result)
        ? redirectTo(safeNextPath(result.data), result.cookies)
        : redirectTo(safeNextPath(result));
    } catch (error) {
      return redirectTo(`/login?error=${encodeURIComponent(errorCode(error, request))}`);
    }
  };
}

function errorCode(caught: unknown, request: Request): string {
  const error = isDatabaseUnavailableError(caught)
    ? new ServiceUnavailableError("Baza danych jest niedostępna", { cause: caught })
    : caught;
  const route = `${request.method} ${new URL(request.url).pathname}`;

  if (error instanceof AppError) {
    if (error.status >= 500) {
      getLogger().error({ err: error, route }, "Błąd infrastruktury w trasie z przekierowaniem");
    }
    return error.code;
  }
  getLogger().error({ err: error, route }, "Nieoczekiwany błąd w trasie z przekierowaniem");
  return UNEXPECTED_ERROR_CODE;
}

function redirectTo(location: string, cookies: readonly string[] = []): Response {
  const headers = new Headers({ location });
  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
  }
  return new Response(null, { status: 302, headers });
}
