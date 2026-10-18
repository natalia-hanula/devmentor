import { afterEach, describe, expect, it, vi } from "vitest";
import { requireDatabaseUrl } from "../src/config";

describe("requireDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("zwraca wartość zmiennej środowiskowej", () => {
    vi.stubEnv("DEVMENTOR_TEST_URL", "postgresql://u:p@localhost:5432/x");
    expect(requireDatabaseUrl("DEVMENTOR_TEST_URL")).toBe("postgresql://u:p@localhost:5432/x");
  });

  it("rzuca czytelny błąd, gdy zmiennej brak", () => {
    vi.stubEnv("DEVMENTOR_TEST_URL", "");
    expect(() => requireDatabaseUrl("DEVMENTOR_TEST_URL")).toThrow(/DEVMENTOR_TEST_URL/);
  });
});
