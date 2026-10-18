import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const em = { forked: true };
const orm = { em: { fork: vi.fn(() => em) } };
const initOrm = vi.fn();

vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  initOrm,
}));

const { DatabaseHealthService, getContainer, ServiceUnavailableError, TechnologyService, withScope } = await import(
  "../src"
);

function resetContainer() {
  delete (globalThis as { __devmentorContainer?: unknown }).__devmentorContainer;
}

describe("getContainer / withScope", () => {
  beforeEach(() => {
    resetContainer();
    initOrm.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
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

  it("withScope daje własny EntityManager i serwisy żądania, a wynik pracy przekazuje dalej", async () => {
    initOrm.mockResolvedValue(orm);

    const result = await withScope(async (cradle) => {
      expect(cradle.em).toBe(em);
      expect(cradle.databaseHealthService).toBeInstanceOf(DatabaseHealthService);
      expect(cradle.technologyService).toBeInstanceOf(TechnologyService);
      expect(cradle.technologyService).toBe(cradle.technologyService);
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
