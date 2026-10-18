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
