import { z } from "zod";
import { emailSchema } from "./email.schema";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.

/** Zaproszenie mentora: sam adres adresata (znormalizowany jak przy rejestracji). */
export const invitationCreateSchema = z.object({ email: emailSchema });

export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>;
