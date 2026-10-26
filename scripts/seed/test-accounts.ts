import type { Role } from "@devmentor/core";

/**
 * Dane testowe, nie sekret (decyzja 2): jedno jawne hasło wszystkich kont z `npm run db:seed`.
 * Seed odmawia działania przy `APP_ENV=production` (skrypt i `SeedService`), więc te konta nie powstaną w produkcji.
 */
export const TEST_PASSWORD = "test-haslo-nie-sekret";

export interface TestAccount {
  email: string;
  displayName: string;
  /** Role, które konto dostaje przy zakładaniu — do wypisania na wyjściu. */
  roles: readonly Role[];
}

/** Fikcyjne konta w domenie `example.com`, nazwy neutralne płciowo (L18). */
export const TEST_ACCOUNTS = {
  operator: { email: "operator.test@example.com", displayName: "Operator testowy", roles: ["operator"] },
  mentee: { email: "mentee.test@example.com", displayName: "Mentee testowe", roles: ["mentee"] },
  mentor: { email: "mentor.test@example.com", displayName: "Mentor testowy", roles: ["mentee", "mentor"] },
} as const satisfies Record<string, TestAccount>;
