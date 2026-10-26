import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@devmentor/db/constants";
import { z } from "zod";
import { emailSchema } from "./email.schema";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.

/** Znaki liczone jako punkty kodowe Unicode (emoji = 1 znak), nie jednostki UTF-16 jak `String.length`. */
function characterCount(value: string): number {
  return Array.from(value).length;
}

/** bcrypt bierze pod uwagę tylko pierwsze 72 bajty — dłuższe hasło odrzucamy zamiast po cichu przycinać. */
function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Podaj hasło" })
    .refine((value) => characterCount(value) >= PASSWORD_MIN_LENGTH, {
      error: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`,
      abort: true,
    })
    .refine((value) => utf8ByteLength(value) <= PASSWORD_MAX_BYTES, {
      error: "Hasło jest za długie — skróć je. Emoji i litery spoza alfabetu łacińskiego zajmują więcej miejsca.",
    }),
  displayName: z
    .string({ error: "Podaj wyświetlaną nazwę" })
    .trim()
    .min(1, "Podaj wyświetlaną nazwę")
    .max(DISPLAY_NAME_MAX_LENGTH, `Nazwa może mieć najwyżej ${DISPLAY_NAME_MAX_LENGTH} znaków`),
});

export type RegisterInput = z.infer<typeof registerSchema>;
