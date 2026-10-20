import { User, UserRole, type EntityManager } from "@devmentor/db";

/** Adresy kont testowych mają prefiks, żeby sprzątanie nie ruszało danych aplikacji. */
export const TEST_EMAIL_PREFIX = "it-";

type RoleName = UserRole["role"];

export interface AccountInput {
  email: string;
  roles: readonly RoleName[];
  displayName?: string;
  emailVerified?: boolean;
  grantedBy?: User;
}

/**
 * Zakłada konto z rolami przez encje MikroORM — prymitywy nie mają serwisu zakładania kont (to E01),
 * a testy bramek ich potrzebują. Podpisywanie tokenu sesji dochodzi z `SessionTokenService` (krok 1.5).
 */
export async function createAccount(em: EntityManager, input: AccountInput): Promise<User> {
  const user = em.create(User, {
    email: `${TEST_EMAIL_PREFIX}${input.email}`,
    displayName: input.displayName ?? "Konto testowe",
    emailVerifiedAt: input.emailVerified === false ? null : new Date(),
  });
  for (const role of input.roles) {
    em.create(UserRole, { user, role, grantedBy: input.grantedBy ?? null });
  }
  await em.flush();
  return user;
}

export async function deleteTestAccounts(em: EntityManager): Promise<void> {
  await em.nativeDelete(User, { email: { $like: `${TEST_EMAIL_PREFIX}%` } });
}
