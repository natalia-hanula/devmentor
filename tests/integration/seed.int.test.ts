import {
  AccountService,
  createLogger,
  NoopMailAdapter,
  PasswordHasher,
  RateLimiter,
  SeedService,
  UserTokenService,
} from "@devmentor/core";
import { initOrm, User, UserToken, type MikroORM } from "@devmentor/db";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { MESSAGES, runSeed, type SeedBackend } from "../../scripts/seed/run-seed.ts";
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../../scripts/seed/test-accounts.ts";
import { uniqueClientIp } from "./support/client-ip";

interface Envelope {
  ok: boolean;
  data: Record<string, unknown>;
}

const SEED_EMAILS = Object.values(TEST_ACCOUNTS).map((account) => account.email);

describe("npm run db:seed (runSeed + SeedService na prawdziwej bazie) → logowanie w next start", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;

  /** Serwis jak w kontenerze, na własnym `EntityManager` dla każdego konta (to, co robi `withScope` w skrypcie). */
  function seedService(): SeedService {
    const em = orm.em.fork();
    const logger = createLogger({ level: "silent" });
    const passwordHasher = new PasswordHasher();
    const accountService = new AccountService({
      em,
      passwordHasher,
      rateLimiter: new RateLimiter(),
      userTokenService: new UserTokenService({ em }),
      mailGateway: new NoopMailAdapter({ logger }),
      logger,
      env: { APP_BASE_URL: baseUrl, MAIL_ADAPTER: "outbox" },
    });
    return new SeedService({ em, passwordHasher, accountService, env: { APP_ENV: "test" } });
  }

  const backend: SeedBackend = {
    appEnv: () => "test",
    createOperator: (input) => seedService().createOperator(input),
    createMentee: (input, emailVerified) => seedService().createMentee(input, emailVerified),
    createMentor: (input, grantedByEmail) => seedService().createMentor(input, grantedByEmail),
    close: async () => undefined,
  };

  async function deleteSeedAccounts(): Promise<void> {
    await orm.em.fork().nativeDelete(User, { email: { $in: SEED_EMAILS } });
  }

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
    await deleteSeedAccounts();
  });

  afterAll(async () => {
    await deleteSeedAccounts();
    await orm.close(true);
  });

  it("zakłada cztery konta (role, granted_by mentora, jeden niepotwierdzony adres); każde loguje się hasłem testowym", async () => {
    const lines: string[] = [];

    expect(await runSeed((line) => lines.push(line), backend)).toBe(0);
    expect(lines.filter((line) => line.endsWith("— utworzone"))).toHaveLength(4);
    expect(lines.at(-1)).toBe(MESSAGES.password);

    const em = orm.em.fork();
    const operator = await em.findOneOrFail(User, { email: TEST_ACCOUNTS.operator.email });
    const mentor = await em.findOneOrFail(User, { email: TEST_ACCOUNTS.mentor.email }, { populate: ["roles"] });
    const mentorRole = mentor.roles.getItems().find((entry) => entry.role === "mentor");
    expect(mentorRole?.grantedBy?.id).toBe(operator.id);
    expect(await em.count(UserToken, { user: { email: { $in: SEED_EMAILS } } })).toBe(0);
    const unverified = await em.findOneOrFail(User, { email: TEST_ACCOUNTS.menteeUnverified.email });
    expect(unverified.emailVerifiedAt).toBeNull();

    for (const account of Object.values(TEST_ACCOUNTS)) {
      const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp() },
        body: JSON.stringify({ email: account.email, password: TEST_PASSWORD }),
      });
      expect(login.status, account.email).toBe(200);
      const cookie = login.headers.getSetCookie()[0]!.split(";")[0]!;

      const me = (await (await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })).json()) as Envelope;
      expect(me.data).toMatchObject({ email: account.email, roles: [...account.roles], emailVerified: account.emailVerified });
    }
  });

  it("drugie uruchomienie (po teście wyżej): konta już istnieją → pominięte, kod 0, bez duplikatów", async () => {
    const lines: string[] = [];

    expect(await runSeed((line) => lines.push(line), backend)).toBe(0);
    expect(lines.filter((line) => line.endsWith("— już istnieje, pomijam"))).toHaveLength(4);
    expect(await orm.em.fork().count(User, { email: { $in: SEED_EMAILS } })).toBe(4);
  });
});
