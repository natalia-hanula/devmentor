import { PASSWORD_MAX_BYTES } from "@devmentor/db/constants";
import { z } from "zod";
import { emailSchema } from "./email.schema";
import { utf8ByteLength } from "./utf8-byte-length";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.

/**
 * Hasło przy logowaniu: niepuste i nie dłuższe niż przy rejestracji (`PASSWORD_MAX_BYTES`) — dłuższe nie mogło
 * zostać ustawione, a przekazane do bcrypt blokowałoby pętlę zdarzeń. Reguły minimalnej długości nie są
 * tu zdradzane ani egzekwowane.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Podaj hasło" })
    .min(1, "Podaj hasło")
    .refine((value) => utf8ByteLength(value) <= PASSWORD_MAX_BYTES, { error: "Hasło jest za długie" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
