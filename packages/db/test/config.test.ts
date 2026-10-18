import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrmConfig, entities, requireDatabaseUrl } from "../src";

describe("createOrmConfig", () => {
  it("ustawia URL, listę encji i domyślnie wyłącza debug", () => {
    const config = createOrmConfig({ clientUrl: "postgresql://u:p@localhost:5432/db" });

    expect(config).toMatchObject({ clientUrl: "postgresql://u:p@localhost:5432/db", entities, debug: false });
  });

  it("pozwala włączyć debug", () => {
    expect(createOrmConfig({ clientUrl: "postgresql://localhost/db", debug: true }).debug).toBe(true);
  });
});

describe("requireDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("domyślnie czyta DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/main");
    expect(requireDatabaseUrl()).toBe("postgresql://u:p@localhost:5432/main");
  });

  it("zwraca wartość wskazanej zmiennej środowiskowej", () => {
    vi.stubEnv("DEVMENTOR_TEST_URL", "postgresql://u:p@localhost:5432/x");
    expect(requireDatabaseUrl("DEVMENTOR_TEST_URL")).toBe("postgresql://u:p@localhost:5432/x");
  });

  it("rzuca czytelny błąd, gdy zmiennej brak", () => {
    vi.stubEnv("DEVMENTOR_TEST_URL", "");
    expect(() => requireDatabaseUrl("DEVMENTOR_TEST_URL")).toThrow(/DEVMENTOR_TEST_URL/);
  });
});
