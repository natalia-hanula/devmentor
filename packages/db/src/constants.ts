// Limity kolumn współdzielone z walidatorami Zod w `@devmentor/core/validators`.
// Plik nie może importować `@mikro-orm/*` — trafia też do bundla przeglądarki (formularze).
export const TECHNOLOGY_NAME_MAX_LENGTH = 64;
export const TECHNOLOGY_SLUG_MAX_LENGTH = 64;
export const EMAIL_MAX_LENGTH = 254; // limit adresu e-mail z RFC 5321
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const USER_ROLES = ["mentee", "mentor", "operator"] as const;
