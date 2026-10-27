import { EMAIL_MAX_LENGTH } from "@devmentor/db/constants";
import { z } from "zod";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.

/** Ta sama normalizacja w walidatorze i w serwisie (CLI i przyszłe ścieżki omijają walidator trasy). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pole e-mail wspólne dla formularzy kont: `trim` + małe litery, potem długość i format.
 * `abort` — przy pustym lub za długim adresie pokazujemy jeden komunikat, nie dodatkowo „zły format”.
 */
export const emailSchema = z
  .string({ error: "Podaj adres e-mail" })
  .trim()
  .toLowerCase()
  .min(1, { error: "Podaj adres e-mail", abort: true })
  .max(EMAIL_MAX_LENGTH, { error: `Adres e-mail może mieć najwyżej ${EMAIL_MAX_LENGTH} znaki`, abort: true })
  .check(z.email({ error: "Podaj poprawny adres e-mail, np. ola@example.com" }));
