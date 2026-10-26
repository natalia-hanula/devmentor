// Limity kolumn współdzielone z walidatorami Zod w `@devmentor/core/validators`.
// Plik nie może importować `@mikro-orm/*` — trafia też do bundla przeglądarki (formularze).
export const TECHNOLOGY_NAME_MAX_LENGTH = 64;
export const TECHNOLOGY_SLUG_MAX_LENGTH = 64;
export const EMAIL_MAX_LENGTH = 254; // limit adresu e-mail z RFC 5321
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const USER_ROLES = ["mentee", "mentor", "operator"] as const;
/**
 * Minimalna długość hasła: kompromis między krótką rejestracją (A05) a NIST 800-63B-4
 * (15 znaków dla hasła jako jedynego składnika) — potwierdzony w grill-me E01 (G5).
 */
export const PASSWORD_MIN_LENGTH = 12;
/** bcrypt ignoruje bajty po 72., więc długość hasła walidujemy w bajtach UTF-8, nie w znakach. */
export const PASSWORD_MAX_BYTES = 72;
/** Hash bcrypt (`$2b$12$…`) ma zawsze 60 znaków. */
export const PASSWORD_HASH_LENGTH = 60;
/** SHA-256 tokenu jako hex. */
export const TOKEN_HASH_LENGTH = 64;
/** `password_reset` wchodzi w etapie B, ale enum (CHECK w bazie) powstaje od razu z obiema wartościami. */
export const USER_TOKEN_PURPOSES = ["email_verification", "password_reset"] as const;
