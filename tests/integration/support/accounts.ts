import { SESSION_COOKIE_NAME, SessionTokenService } from "@devmentor/core";
import { User, UserRole, type EntityManager } from "@devmentor/db";
import { TEST_APP_ENV, TEST_AUTH_JWT_SECRET } from "./test-env";

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
 * a testy bramek ich potrzebują. Token sesji podpisuje `sessionCookieFor`.
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

const tokenService = (secret: string) =>
  new SessionTokenService({ env: { AUTH_JWT_SECRET: secret, APP_ENV: TEST_APP_ENV } });

/** Nagłówek `Cookie` z tokenem sesji konta, podpisanym sekretem aplikacji testowej (albo podanym — dla tokenów obcych). */
export async function sessionCookieFor(user: User, secret = TEST_AUTH_JWT_SECRET): Promise<string> {
  const token = await tokenService(secret).sign({ id: user.id, sessionVersion: user.sessionVersion });
  return `${SESSION_COOKIE_NAME}=${token}`;
}
