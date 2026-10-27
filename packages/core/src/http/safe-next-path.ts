/** Ścieżka względna w obrębie aplikacji: zaczyna się od `/`, ale nie `//` ani `/\`, bez znaków sterujących i `\`. */
const SAFE_NEXT_PATH = /^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/;

const FALLBACK_PATH = "/";

/**
 * Parametr `next` (powrót po zalogowaniu) pochodzi od użytkownika, więc nie wolno go ślepo przekierować:
 * `//evil.pl`, `/\evil.pl`, `https://…` czy `javascript:` zrobiłyby z logowania otwarte przekierowanie.
 * Znaki sterujące odrzucamy dlatego, że przeglądarki usuwają z adresów tabulatory i znaki nowej linii
 * (`/<TAB>/evil.pl` stałoby się `//evil.pl`). Wszystko inne niż bezpieczna ścieżka daje `/`.
 */
export function safeNextPath(value: string | null | undefined): string {
  return value !== null && value !== undefined && SAFE_NEXT_PATH.test(value) ? value : FALLBACK_PATH;
}
