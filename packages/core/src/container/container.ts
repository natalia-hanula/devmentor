import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { initOrm } from "@devmentor/db";
import { parseEnv } from "../config/env";
import { ServiceUnavailableError } from "../http/errors";
import { getLogger } from "../logger";
import { AccountService } from "../services/auth/account.service";
import { PasswordHasher } from "../services/auth/password-hasher.service";
import { SessionTokenService } from "../services/auth/session-token.service";
import { UserTokenService } from "../services/auth/user-token.service";
import { createMailAdapters } from "../services/mail/mail-gateway";
import { DatabaseHealthService } from "../services/health/database-health.service";
import { TechnologyService } from "../services/mentors/technology.service";
import { RateLimiter } from "../services/rate-limit/rate-limiter.service";
import type { AppCradle, RequestCradle } from "./cradle";

/**
 * Kontener z ustawieniami projektu: `PROXY` (zależności jako jeden obiekt w konstruktorze)
 * i `strict` (błąd, gdy singleton zależy od czegoś o krótszym czasie życia).
 */
export function createAppContainer<Cradle extends object>(): AwilixContainer<Cradle> {
  return createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
}

async function buildContainer(): Promise<AwilixContainer<AppCradle>> {
  const env = parseEnv();
  const logger = getLogger();
  const orm = await initOrm(env.DATABASE_URL).catch((error: unknown) => {
    throw new ServiceUnavailableError("Baza danych jest niedostępna", { cause: error });
  });

  const { mailGateway, mailOutbox } = createMailAdapters({ env, logger });

  const container = createAppContainer<AppCradle>();
  container.register({
    env: asValue(env),
    logger: asValue(logger),
    orm: asValue(orm),
    sessionTokenService: asClass(SessionTokenService).singleton(),
    passwordHasher: asClass(PasswordHasher).singleton(),
    rateLimiter: asFunction(() => new RateLimiter()).singleton(),
    mailGateway: asValue(mailGateway),
    mailOutbox: asValue(mailOutbox),
  });
  return container;
}

const globalForContainer = globalThis as unknown as {
  __devmentorContainer?: Promise<AwilixContainer<AppCradle>>;
};

/** Kontener główny, tworzony raz na proces (Promise na `globalThis` przetrwa HMR w `next dev`). */
export function getContainer(): Promise<AwilixContainer<AppCradle>> {
  globalForContainer.__devmentorContainer ??= buildContainer().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}

/**
 * Zamyka pulę połączeń ORM i zapomina kontener — dla procesów krótkich (skrypty CLI), które muszą się
 * zakończyć. Aplikacja Next tego nie woła: kontener żyje tyle co proces. Kontener, który nie powstał,
 * nie ma puli do zamknięcia (jego błąd zgłosiło już `getContainer`).
 */
export async function closeContainer(): Promise<void> {
  const pending = globalForContainer.__devmentorContainer;
  globalForContainer.__devmentorContainer = undefined;
  if (!pending) {
    return;
  }
  const container = await pending.catch(() => null);
  await container?.cradle.orm.close(true);
}

/** Rejestracja zależności żądania — każdy serwis jawnie, bez skanowania folderów. */
function registerRequestDependencies(scope: AwilixContainer<RequestCradle>, orm: AppCradle["orm"]): void {
  scope.register({
    em: asValue(orm.em.fork()),
    databaseHealthService: asClass(DatabaseHealthService).scoped(),
    technologyService: asClass(TechnologyService).scoped(),
    userTokenService: asClass(UserTokenService).scoped(),
    accountService: asClass(AccountService).scoped(),
  });
}

/**
 * Uruchamia `work` w scope jednego żądania (własny `EntityManager`) i sprząta po nim.
 * Jedyny sposób, w jaki trasy i strony sięgają po serwisy.
 */
export async function withScope<T>(work: (cradle: RequestCradle) => Promise<T>): Promise<T> {
  const container = await getContainer();
  const scope = container.createScope<RequestCradle>();
  registerRequestDependencies(scope, container.cradle.orm);
  try {
    return await work(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
