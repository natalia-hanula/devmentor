import { z } from "zod";

// Plik trafia też do przeglądarki — importuj tu tylko `zod` i `@devmentor/db/constants`.

/**
 * Górna granica długości tokenu z linku. Dzisiejszy token ma 43 znaki (32 bajty w base64url); zapas na
 * zmianę formatu, a granica odcina śmieci, zanim trafią do hashowania i zapytania.
 */
export const TOKEN_MAX_LENGTH = 256;
export const INVALID_LINK_MESSAGE = "Link jest nieważny albo wygasł";

/** Token z fragmentu linku (`#token=`) — wspólny dla weryfikacji e-maila, resetu hasła i zaproszenia. */
export const tokenConfirmSchema = z.object({
  token: z
    .string({ error: INVALID_LINK_MESSAGE })
    .min(1, { error: INVALID_LINK_MESSAGE, abort: true })
    .max(TOKEN_MAX_LENGTH, { error: INVALID_LINK_MESSAGE }),
});

export type TokenConfirmInput = z.infer<typeof tokenConfirmSchema>;
