import { isDatabaseUnavailableError } from "@devmentor/db";
import { getLogger } from "../logger";
import { AppError, ServiceUnavailableError } from "./errors";
import { DataWithCookies } from "./api-handler";
import type { RouteContext, RouteHandler } from "./api-handler";

const UNEXPECTED_ERROR_CODE = "unexpected";

/**
 * Drugi kanoniczny wrapper tras obok `apiHandler`, dla tras, które odpowiadają przekierowaniem
 * (callback OAuth i każde przyszłe). Handler zwraca adres docelowy (ścieżkę względną) albo
 * `withCookies(adres, cookies)`. Tylko `GET` — te trasy nie zmieniają stanu poza sesją, więc nie
 * wymagają nagłówka CSRF. Błąd zamienia na `302 /login?error=<kod>`; nie ujawnia stack trace'ów.
 * Loguje wyłącznie `pathname`: callback OAuth niesie w query `code` i `state`.
 */
export function redirectHandler(
  handler: (request: Request, context: RouteContext) => Promise<string | DataWithCookies<string>>,
): RouteHandler {
  return async (request, context) => {
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers: { allow: "GET" } });
    }
    try {
      const result = await handler(request, context);
      return result instanceof DataWithCookies
        ? redirectTo(result.data, result.cookies)
        : redirectTo(result);
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
