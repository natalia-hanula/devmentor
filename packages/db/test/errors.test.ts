import { ConnectionException, DriverException } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { initOrm, isDatabaseUnavailableError, Technology } from "../src";

function driverError(code?: unknown): DriverException {
  return new DriverException(Object.assign(new Error("błąd sterownika"), { code }));
}

describe("isDatabaseUnavailableError", () => {
  it("rozpoznaje odrzucone połączenie z bazą (MikroORM łączy się leniwie)", async () => {
    // Port 1 — połączenie od razu odrzucone, bez potrzeby działającej bazy.
    const orm = await initOrm("postgresql://devmentor:devmentor@127.0.0.1:1/devmentor");
    try {
      const error = await orm.em
        .fork()
        .find(Technology, {})
        .catch((e: unknown) => e);

      expect(isDatabaseUnavailableError(error)).toBe(true);
    } finally {
      await orm.close(true);
    }
  });

  it("rozpoznaje ConnectionException, kody sieciowe i SQLSTATE klasy 08", () => {
    expect(isDatabaseUnavailableError(new ConnectionException(new Error("brak połączenia")))).toBe(true);
    expect(isDatabaseUnavailableError(driverError("ETIMEDOUT"))).toBe(true);
    expect(isDatabaseUnavailableError(driverError("08006"))).toBe(true);
  });

  it("nie klasyfikuje innych błędów jako niedostępności bazy", () => {
    expect(isDatabaseUnavailableError(driverError("23505"))).toBe(false);
    expect(isDatabaseUnavailableError(driverError(undefined))).toBe(false);
    expect(isDatabaseUnavailableError(new Error("ECONNREFUSED"))).toBe(false);
    expect(isDatabaseUnavailableError(null)).toBe(false);
  });
});
