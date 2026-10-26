import { z } from "zod";
import { emailSchema } from "./email.schema";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.

/** Hasło przy logowaniu: tylko niepuste — reguły długości z rejestracji nie są tu zdradzane ani egzekwowane. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Podaj hasło" }).min(1, "Podaj hasło"),
});

export type LoginInput = z.infer<typeof loginSchema>;
