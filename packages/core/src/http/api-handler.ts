import { isDatabaseUnavailableError } from "@devmentor/db";
import { z } from "zod";
import { getLogger } from "../logger";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  ValidationError,
  type FieldErrors,
} from "./errors";

/**
 * Koperta odpowiedzi API. To konwencja kształtu, nie współdzielony typ — `@devmentor/ui`
 * deklaruje własną kopię w `backend/api/types.ts`, bo `ui` nie importuje `core`.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: FieldErrors } };

/**
 * Nagłówek, który `apiCall` (ui) dokleja do każdego żądania. Zwykły formularz HTML ani
 * żądanie z obcej strony go nie wyśle — to minimalna ochrona CSRF dla tras zmieniających stan.
 */
export const REQUEST_MARKER_HEADER = "x-devmentor-request";

/**
 * Górny limit treści JSON. Formularze API mają po kilka pól (hasło ≤ 72 bajty, e-mail, nazwa), więc 16 KiB
 * z zapasem wystarcza, a publiczna trasa (logowanie) nie parsuje megabajtowych ciał od anonimowych klientów.
 */
export const JSON_BODY_MAX_BYTES = 16 * 1024;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface RouteContext {
  params: Promise<Record<string, string | string[] | undefined>>;
}

export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

/**
 * Znacznik rozpoznawania `DataWithCookies`. Każda warstwa Next (trasa, współdzielony chunk) może mieć własną
 * kopię modułu, więc `instanceof` zawodzi; symbol z rejestru globalnego jest wspólny dla wszystkich kopii.
 */
const DATA_WITH_COOKIES_MARKER = Symbol.for("devmentor.data-with-cookies");

/** Wynik handlera z ciasteczkami do ustawienia (`Set-Cookie`) — tworzy go `withCookies`. */
export class DataWithCookies<T> {
  readonly [DATA_WITH_COOKIES_MARKER] = true;

  constructor(
    readonly data: T,
    readonly cookies: readonly string[],
  ) {}
}

/** Rozpoznaje wynik `withCookies` po znaczniku, nie po klasie (zob. `DATA_WITH_COOKIES_MARKER`). */
export function isDataWithCookies<T>(value: T | DataWithCookies<T>): value is DataWithCookies<T> {
  return typeof value === "object" && value !== null && DATA_WITH_COOKIES_MARKER in value;
}

/** Handler zwraca `withCookies(data, [cookie, …])`, gdy odpowiedź ma ustawić ciasteczka (logowanie, wylogowanie). */
export function withCookies<T>(data: T, cookies: readonly string[]): DataWithCookies<T> {
  return new DataWithCookies(data, cookies);
}

export interface ApiHandlerOptions {
  /** Status odpowiedzi przy sukcesie, np. 201 dla tworzenia. */
  successStatus?: number;
}

/**
 * Opakowuje funkcję trasy: weryfikuje nagłówek CSRF, zamienia wynik na kopertę `{ ok, data }`,
 * a rzucone `AppError` na `{ ok: false, error }` z właściwym statusem. Nieoczekiwane błędy
 * są logowane i zwracane jako ogólny 500 — bez stack trace'a dla klienta.
 */
export function apiHandler<T>(
  handler: (request: Request, context: RouteContext) => Promise<T | DataWithCookies<T>>,
  { successStatus = 200 }: ApiHandlerOptions = {},
): RouteHandler {
  return async (request, context) => {
    try {
      assertRequestMarker(request);
      const result = await handler(request, context);
      if (isDataWithCookies(result)) {
        return json<T>({ ok: true, data: result.data }, successStatus, result.cookies);
      }
      return json<T>({ ok: true, data: result }, successStatus);
    } catch (error) {
      return errorResponse(error, request);
    }
  };
}

/**
 * Odczytuje body JSON (najwyżej `maxBytes`, inaczej 413 — bez wczytywania reszty) i waliduje je schematem —
 * do serwisu trafia tylko sparsowany, jawny kształt.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes: number = JSON_BODY_MAX_BYTES,
): Promise<z.infer<S>> {
  const text = await readBodyText(request, maxBytes);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ValidationError("Treść żądania nie jest poprawnym JSON-em");
  }
  return parseInput(schema, body);
}

/** Nagłówek `content-length` tylko skraca drogę; limit egzekwuje liczenie bajtów, bo nagłówka może nie być albo kłamać. */
async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) {
    return "";
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Nieprawidłowe dane", toFieldErrors(result.error));
  }
  return result.data;
}

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function assertRequestMarker(request: Request): void {
  if (SAFE_METHODS.has(request.method)) {
    return;
  }
  if (request.headers.get(REQUEST_MARKER_HEADER) !== "1") {
    throw new ForbiddenError("Brak nagłówka żądania aplikacji");
  }
}

function errorResponse(caught: unknown, request: Request): Response {
  const logger = getLogger();
  const error = isDatabaseUnavailableError(caught)
    ? new ServiceUnavailableError("Baza danych jest niedostępna", { cause: caught })
    : caught;
  const route = `${request.method} ${new URL(request.url).pathname}`;

  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error({ err: error, route }, "Błąd infrastruktury w trasie API");
    }
    const fieldErrors =
      error instanceof ValidationError || error instanceof ConflictError ? error.fieldErrors : undefined;
    return json(
      { ok: false, error: { code: error.code, message: error.message, ...(fieldErrors && { fieldErrors }) } },
      error.status,
    );
  }

  logger.error({ err: error, route }, "Nieoczekiwany błąd w trasie API");
  return json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Wystąpił nieoczekiwany błąd" } }, 500);
}

function json<T>(body: ApiResult<T>, status: number, cookies: readonly string[] = []): Response {
  const headers = new Headers();
  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
  }
  return Response.json(body, { status, headers });
}
