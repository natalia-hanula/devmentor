/**
 * Strony startowe ról (L03): tu trafia osoba po zalogowaniu bez `next` i z widoku „Brak dostępu”.
 * Bez importów — korzystają z tego i strony serwerowe, i komponenty klienckie. Role jako napisy
 * (kształt `roles` z `/api/auth/*`), bo kod przeglądarki nie importuje głównego `@devmentor/core`.
 */
export const ROLE_START_PATHS = {
  operator: "/admin/invitations",
  mentor: "/mentor",
  mentee: "/account",
} as const;

/** Operator ma wyłącznie swoją rolę (Q17); mentor ma zawsze też `mentee`, więc mentor wygrywa z mentee. */
export function roleStartPath(roles: readonly string[]): string {
  if (roles.includes("operator")) {
    return ROLE_START_PATHS.operator;
  }
  if (roles.includes("mentor")) {
    return ROLE_START_PATHS.mentor;
  }
  return ROLE_START_PATHS.mentee;
}
