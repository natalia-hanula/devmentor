import { ConnectionException, DriverException } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { initOrm, isDatabaseUnavailableError, Technology, User } from "../src";

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

  it.each(["127.0.0.1", "localhost"])(
    "rozpoznaje niedostępną bazę przy zapisie (flush), gdy sterownik nie opakowuje błędu — host %s",
    async (host) => {
      const orm = await initOrm(`postgresql://devmentor:devmentor@${host}:1/devmentor`);
      try {
        const em = orm.em.fork();
        em.create(User, { email: "a@example.com", displayName: "A", passwordHash: null, emailVerifiedAt: null });
        const error = await em.flush().catch((e: unknown) => e);

        expect(isDatabaseUnavailableError(error)).toBe(true);
      } finally {
        await orm.close(true);
      }
    },
  );

  it("rozpoznaje ConnectionException, kody sieciowe i SQLSTATE klasy 08", () => {
    expect(isDatabaseUnavailableError(new ConnectionException(new Error("brak połączenia")))).toBe(true);
    expect(isDatabaseUnavailableError(driverError("ETIMEDOUT"))).toBe(true);
    expect(isDatabaseUnavailableError(driverError("08006"))).toBe(true);
    expect(isDatabaseUnavailableError(Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }))).toBe(true);
  });

  it("nie klasyfikuje innych błędów jako niedostępności bazy", () => {
    expect(isDatabaseUnavailableError(driverError("23505"))).toBe(false);
    expect(isDatabaseUnavailableError(driverError(undefined))).toBe(false);
    expect(isDatabaseUnavailableError(new Error("ECONNREFUSED"))).toBe(false);
    // SQLSTATE 08 tylko z błędu sterownika opakowanego przez MikroORM; inne kody na zwykłym błędzie — nie.
    expect(isDatabaseUnavailableError(Object.assign(new Error("x"), { code: "08006" }))).toBe(false);
    expect(isDatabaseUnavailableError(Object.assign(new Error("x"), { code: 42 }))).toBe(false);
    expect(isDatabaseUnavailableError(null)).toBe(false);
  });
});
