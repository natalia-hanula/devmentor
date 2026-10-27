import type { Role } from "@devmentor/core";

/**
 * Dane testowe, nie sekret (decyzja 2): jedno jawne hasło wszystkich kont z `npm run db:seed`.
 * Seed działa tylko przy `APP_ENV=local` lub `test` (skrypt i `SeedService`), więc te konta nie powstaną na stagingu ani w produkcji.
 */
export const TEST_PASSWORD = "test-haslo-nie-sekret";

export interface TestAccount {
  email: string;
  displayName: string;
  /** Role, które konto dostaje przy zakładaniu — do wypisania na wyjściu. */
  roles: readonly Role[];
  /** `false` tylko dla konta mentee do sprawdzania banera „Potwierdź adres e-mail”; operator i mentor zawsze potwierdzeni. */
  emailVerified: boolean;
}

/** Fikcyjne konta w domenie `example.com`, nazwy neutralne płciowo (L18). */
export const TEST_ACCOUNTS = {
  operator: { email: "operator.test@example.com", displayName: "Operator testowy", roles: ["operator"], emailVerified: true },
  mentee: { email: "mentee.test@example.com", displayName: "Mentee testowe", roles: ["mentee"], emailVerified: true },
  mentor: {
    email: "mentor.test@example.com",
    displayName: "Mentor testowy",
    roles: ["mentee", "mentor"],
    emailVerified: true,
  },
  menteeUnverified: {
    email: "mentee.niepotwierdzone@example.com",
    displayName: "Mentee z niepotwierdzonym adresem",
    roles: ["mentee"],
    emailVerified: false,
  },
} as const satisfies Record<string, TestAccount>;
