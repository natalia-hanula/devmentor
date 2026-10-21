/**
 * Koperta odpowiedzi API — lokalna kopia konwencji z `@devmentor/core` (`http/api-handler.ts`).
 * Celowo zduplikowana: `ui` nie importuje `core`. Zmiana kształtu = zmiana w obu miejscach.
 */
export type FieldErrors = Record<string, string[]>;

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Kopia kodu `TOO_MANY_REQUESTS` (HTTP 429) z `TooManyRequestsError` w `@devmentor/core`. */
export const TOO_MANY_REQUESTS_CODE = "TOO_MANY_REQUESTS";
