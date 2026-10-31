import { ConnectionException, DriverException } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { isDatabaseUnavailableError } from "../src";

function driverError(code?: unknown): DriverException {
  return new DriverException(Object.assign(new Error("błąd sterownika"), { code }));
}

describe("isDatabaseUnavailableError", () => {
  // Atrapy błędów w kształcie, jaki zgłasza Node przy odrzuconym połączeniu — test nie łączy się z siecią.
  // Prawdziwą bazę (i odrzucone połączenie) pokrywają testy integracyjne.
  it("rozpoznaje odrzucone połączenie opakowane przez MikroORM w ConnectionException (zapytanie)", () => {
    const refused = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" });

    expect(isDatabaseUnavailableError(new ConnectionException(refused))).toBe(true);
  });

  it.each([
    ["host 127.0.0.1 (IPv4)", Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" })],
    ["host localhost (IPv4 + IPv6)", Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" })],
  ])("rozpoznaje niedostępną bazę przy zapisie (flush), gdy sterownik nie opakowuje błędu — %s", (_name, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

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
