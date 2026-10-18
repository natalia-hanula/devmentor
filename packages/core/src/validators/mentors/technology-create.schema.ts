import { TECHNOLOGY_NAME_MAX_LENGTH, TECHNOLOGY_SLUG_MAX_LENGTH } from "@devmentor/db/constants";
import { z } from "zod";

// Plik trafia też do przeglądarki (CrudForm) — importuj tu tylko `zod` i `@devmentor/db/constants`.
export const technologyCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Podaj nazwę")
    .max(TECHNOLOGY_NAME_MAX_LENGTH, `Nazwa może mieć najwyżej ${TECHNOLOGY_NAME_MAX_LENGTH} znaki`),
  slug: z
    .string()
    .trim()
    .min(1, "Podaj slug")
    .max(TECHNOLOGY_SLUG_MAX_LENGTH, `Slug może mieć najwyżej ${TECHNOLOGY_SLUG_MAX_LENGTH} znaki`)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tylko małe litery, cyfry i myślniki, np. node-js"),
});

export type TechnologyCreateInput = z.infer<typeof technologyCreateSchema>;
