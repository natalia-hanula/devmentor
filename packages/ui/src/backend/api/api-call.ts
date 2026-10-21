import { TOO_MANY_REQUESTS_CODE, type ApiError, type ApiResult } from "./types";

/** Musi odpowiadać `REQUEST_MARKER_HEADER` w `@devmentor/core` — serwer odrzuca zapisy bez niego (CSRF). */
const REQUEST_MARKER_HEADER = "x-devmentor-request";

const HTTP_TOO_MANY_REQUESTS = 429;
const TOO_MANY_REQUESTS_MESSAGE = "Za dużo prób. Spróbuj za chwilę.";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiCallOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

export class ApiCallError extends Error {
  constructor(readonly error: ApiError) {
    super(error.message);
    this.name = "ApiCallError";
  }
}

/** Jedyne miejsce w aplikacji, które wywołuje `fetch()` do `/api/*`. */
export async function apiCall<T>(path: string, { method = "GET", body, signal }: ApiCallOptions = {}): Promise<ApiResult<T>> {
  if (!path.startsWith("/api/")) {
    return failure("INVALID_PATH", `apiCall obsługuje tylko ścieżki /api/*, otrzymano: ${path}`);
  }

  const headers: Record<string, string> = { Accept: "application/json", [REQUEST_MARKER_HEADER]: "1" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return failure("ABORTED", "Żądanie zostało przerwane");
    }
    return failure("NETWORK_ERROR", "Brak połączenia z serwerem");
  }

  const payload = await readJsonSafe(response);
  if (isApiResult<T>(payload)) {
    return payload;
  }
  // 429 bez koperty (np. limit na reverse proxy) — nadal wiadomo, co powiedzieć użytkownikowi.
  if (response.status === HTTP_TOO_MANY_REQUESTS) {
    return failure(TOO_MANY_REQUESTS_CODE, TOO_MANY_REQUESTS_MESSAGE);
  }
  return failure("INVALID_RESPONSE", `Nieoczekiwana odpowiedź serwera (HTTP ${response.status})`);
}

/** Wariant dla miejsc, które wolą wyjątek niż rozgałęzienie na `ok`. */
export async function apiCallOrThrow<T>(path: string, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) {
    throw new ApiCallError(result.error);
  }
  return result.data;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }
  if (value.ok === true) {
    return "data" in value;
  }
  if (value.ok !== false || !("error" in value)) {
    return false;
  }
  const { error } = value;
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

function failure(code: string, message: string): ApiResult<never> {
  return { ok: false, error: { code, message } };
}
