import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const em = { forked: true };
const orm = { em: { fork: vi.fn(() => em) } };
const initOrm = vi.fn();

vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  initOrm,
}));

const {
  AccountService,
  DatabaseHealthService,
  getContainer,
  NoopMailAdapter,
  OutboxMailAdapter,
  PasswordHasher,
  RateLimiter,
  ServiceUnavailableError,
  TechnologyService,
  UserTokenService,
  withScope,
} = await import("../src");

function resetContainer() {
  delete (globalThis as { __devmentorContainer?: unknown }).__devmentorContainer;
}

describe("getContainer / withScope", () => {
  beforeEach(() => {
    resetContainer();
    initOrm.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_JWT_SECRET", "s".repeat(32));
    // Bez APP_ENV obowiązuje production, która wymaga TRUST_PROXY=true.
    vi.stubEnv("TRUST_PROXY", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetContainer();
  });

  it("tworzy kontener raz na proces z env, loggerem i ORM", async () => {
    initOrm.mockResolvedValue(orm);

    const first = await getContainer();
    const second = await getContainer();

    expect(first).toBe(second);
    expect(initOrm).toHaveBeenCalledOnce();
    expect(initOrm).toHaveBeenCalledWith("postgresql://u:p@localhost:5432/db");
    expect(first.cradle.env.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/db");
    expect(first.cradle.orm).toBe(orm);
    expect(typeof first.cradle.logger.info).toBe("function");
  });

  it("rejestruje RateLimiter jako singleton kontenera głównego, wspólny dla wszystkich scope", async () => {
    initOrm.mockResolvedValue(orm);
    const container = await getContainer();

    const fromFirstScope = await withScope(async (cradle) => cradle.rateLimiter);
    const fromSecondScope = await withScope(async (cradle) => cradle.rateLimiter);

    expect(container.cradle.rateLimiter).toBeInstanceOf(RateLimiter);
    expect(fromFirstScope).toBe(container.cradle.rateLimiter);
    expect(fromSecondScope).toBe(container.cradle.rateLimiter);
  });

  it("rejestruje PasswordHasher jako singleton kontenera głównego, a UserTokenService osobno w każdym scope", async () => {
    initOrm.mockResolvedValue(orm);
    const container = await getContainer();

    const first = await withScope(async (cradle) => [cradle.passwordHasher, cradle.userTokenService] as const);
    const second = await withScope(async (cradle) => [cradle.passwordHasher, cradle.userTokenService] as const);

    expect(container.cradle.passwordHasher).toBeInstanceOf(PasswordHasher);
    expect(first[0]).toBe(container.cradle.passwordHasher);
    expect(second[0]).toBe(container.cradle.passwordHasher);
    expect(first[1]).not.toBe(second[1]);
  });

  it("przy MAIL_ADAPTER=outbox rejestruje jedną skrzynkę jako mailGateway i mailOutbox, wspólną dla scope", async () => {
    initOrm.mockResolvedValue(orm);
    vi.stubEnv("APP_ENV", "test");
    const container = await getContainer();

    const fromScope = await withScope(async (cradle) => cradle.mailOutbox);

    expect(container.cradle.env.MAIL_ADAPTER).toBe("outbox");
    expect(container.cradle.mailGateway).toBeInstanceOf(OutboxMailAdapter);
    expect(container.cradle.mailOutbox).toBe(container.cradle.mailGateway);
    expect(fromScope).toBe(container.cradle.mailGateway);
  });

  it("przy APP_ENV=production rejestruje NoopMailAdapter i brak skrzynki", async () => {
    initOrm.mockResolvedValue(orm);
    vi.stubEnv("APP_ENV", "production");
    const container = await getContainer();

    expect(container.cradle.mailGateway).toBeInstanceOf(NoopMailAdapter);
    expect(container.cradle.mailOutbox).toBeNull();
  });

  it("withScope daje własny EntityManager i serwisy żądania, a wynik pracy przekazuje dalej", async () => {
    initOrm.mockResolvedValue(orm);

    const result = await withScope(async (cradle) => {
      expect(cradle.em).toBe(em);
      expect(cradle.databaseHealthService).toBeInstanceOf(DatabaseHealthService);
      expect(cradle.technologyService).toBeInstanceOf(TechnologyService);
      expect(cradle.technologyService).toBe(cradle.technologyService);
      expect(cradle.userTokenService).toBeInstanceOf(UserTokenService);
      expect(cradle.userTokenService).toBe(cradle.userTokenService);
      expect(cradle.accountService).toBeInstanceOf(AccountService);
      expect(cradle.accountService).toBe(cradle.accountService);
      return "wynik";
    });

    expect(result).toBe("wynik");
    expect(orm.em.fork).toHaveBeenCalled();
  });

  it("sprząta scope także wtedy, gdy praca rzuci wyjątek", async () => {
    initOrm.mockResolvedValue(orm);

    await expect(
      withScope(async () => {
        throw new Error("błąd w serwisie");
      }),
    ).rejects.toThrow("błąd w serwisie");
  });

  it("zamienia błąd inicjalizacji ORM na ServiceUnavailableError i pozwala spróbować ponownie", async () => {
    initOrm.mockRejectedValueOnce(new Error("bad config")).mockResolvedValueOnce(orm);

    await expect(getContainer()).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(getContainer()).resolves.toBeDefined();
    expect(initOrm).toHaveBeenCalledTimes(2);
  });
});
