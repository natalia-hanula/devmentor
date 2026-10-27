import {
  AccountService,
  type AccountServiceDependencies,
  createLogger,
  NoopMailAdapter,
  PasswordHasher,
  RateLimiter,
  SESSION_COOKIE_NAME,
  SessionTokenService,
  UserTokenService,
} from "@devmentor/core";
import { MentorInvitation, User, UserRole, type EntityManager } from "@devmentor/db";
import { uniqueClientIp } from "./client-ip";
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
  /** Hasło do logowania z formularza (hash bcrypt jak w `AccountService`); bez niego konto nie ma hasła. */
  password?: string;
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
    passwordHash: input.password === undefined ? null : await new PasswordHasher().hash(input.password),
  });
  for (const role of input.roles) {
    em.create(UserRole, { user, role, grantedBy: input.grantedBy ?? null });
  }
  await em.flush();
  return user;
}

export async function deleteTestAccounts(em: EntityManager): Promise<void> {
  // Zaproszenia nie mają FK CASCADE do adresata (to tylko adres), więc sprzątamy je po adresie testowym.
  await em.nativeDelete(MentorInvitation, { email: { $like: `${TEST_EMAIL_PREFIX}%` } });
  await em.nativeDelete(User, { email: { $like: `${TEST_EMAIL_PREFIX}%` } });
}

const tokenService = (secret: string) =>
  new SessionTokenService({ env: { AUTH_JWT_SECRET: secret, APP_ENV: TEST_APP_ENV } });

/** Nagłówek `Cookie` z tokenem sesji konta, podpisanym sekretem aplikacji testowej (albo podanym — dla tokenów obcych). */
export async function sessionCookieFor(user: User, secret = TEST_AUTH_JWT_SECRET): Promise<string> {
  const token = await tokenService(secret).sign({ id: user.id, sessionVersion: user.sessionVersion });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

/** `AccountService` złożony jak w kontenerze, na podanym `EntityManager` (to, co robi `withScope` w CLI `operator:create`); `overrides` podmienia wybrane zależności (np. wadliwy serwis tokenów). */
export function accountServiceFor(
  em: EntityManager,
  appBaseUrl: string,
  overrides: Partial<AccountServiceDependencies> = {},
): AccountService {
  const logger = createLogger({ level: "silent" });
  return new AccountService({
    em,
    passwordHasher: new PasswordHasher(),
    rateLimiter: new RateLimiter(),
    userTokenService: new UserTokenService({ em }),
    mailGateway: new NoopMailAdapter({ logger }),
    logger,
    env: { APP_BASE_URL: appBaseUrl, MAIL_ADAPTER: "outbox" },
    ...overrides,
  });
}

/**
 * Konto operatora tą samą drogą co CLI (`AccountService.createOperator`) i zalogowane przez
 * `/api/auth/login` (spec E01, krok 8). Adres dostaje prefiks kont testowych. Zwraca nagłówek `Cookie`.
 */
export async function createOperatorAndLogIn(
  em: EntityManager,
  baseUrl: string,
  input: { email: string; password: string },
): Promise<string> {
  const email = `${TEST_EMAIL_PREFIX}${input.email}`;
  await accountServiceFor(em, baseUrl).createOperator({ email, displayName: "Operator testowy", password: input.password });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp() },
    body: JSON.stringify({ email, password: input.password }),
  });
  if (response.status !== 200) {
    throw new Error(`Logowanie operatora nie powiodło się: ${response.status}`);
  }
  return response.headers.getSetCookie()[0]!.split(";")[0]!;
}
