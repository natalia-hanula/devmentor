import { describe, expect, it } from "vitest";
import { parseEnv } from "../src";

const DATABASE_URL = "postgresql://u:p@localhost:5432/db";
const SECRET = "s".repeat(32);
// Bez APP_ENV obowiązuje production, a tam TRUST_PROXY=true jest wymagany.
const valid = { DATABASE_URL, AUTH_JWT_SECRET: SECRET, TRUST_PROXY: "true" };

describe("parseEnv", () => {
  it("uzupełnia wartości domyślne; APP_ENV domyślnie production (fail closed)", () => {
    const env = parseEnv(valid);

    expect(env).toEqual({
      NODE_ENV: "development",
      DATABASE_URL,
      LOG_LEVEL: "info",
      AUTH_JWT_SECRET: SECRET,
      APP_BASE_URL: "http://localhost:3000",
      APP_ENV: "production",
      TRUST_PROXY: true,
      MAIL_ADAPTER: "noop",
    });
  });

  it("przyjmuje jawne APP_ENV i APP_BASE_URL", () => {
    const env = parseEnv({ ...valid, APP_ENV: "staging", APP_BASE_URL: "https://staging.devmentor.pl" });

    expect(env.APP_ENV).toBe("staging");
    expect(env.APP_BASE_URL).toBe("https://staging.devmentor.pl");
  });

  it("odrzuca brakujący lub nie-postgresowy DATABASE_URL, nie ujawniając wartości", () => {
    expect(() => parseEnv({ AUTH_JWT_SECRET: SECRET })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://secret-pass@host/db" })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://secret-pass@host/db" })).not.toThrow(/secret-pass/);
  });

  it("odrzuca brakujący AUTH_JWT_SECRET", () => {
    expect(() => parseEnv({ DATABASE_URL })).toThrow(/AUTH_JWT_SECRET jest wymagany/);
  });

  it("odrzuca sekret krótszy niż 32 bajty, liczone w UTF-8, i nie ujawnia jego wartości", () => {
    const short = "x".repeat(31);

    expect(() => parseEnv({ ...valid, AUTH_JWT_SECRET: short })).toThrow(/co najmniej 32 bajty/);
    expect(() => parseEnv({ ...valid, AUTH_JWT_SECRET: short })).not.toThrow(new RegExp(short));
    // 16 znaków po 2 bajty = 32 bajty: przechodzi, choć ma tylko 16 znaków.
    expect(parseEnv({ ...valid, AUTH_JWT_SECRET: "ą".repeat(16) }).AUTH_JWT_SECRET).toHaveLength(16);
  });

  it("odrzuca APP_ENV spoza listy i APP_BASE_URL spoza http(s)", () => {
    expect(() => parseEnv({ ...valid, APP_ENV: "prod" })).toThrow(/APP_ENV/);
    expect(() => parseEnv({ ...valid, APP_BASE_URL: "ftp://devmentor.pl" })).toThrow(/APP_BASE_URL/);
    expect(() => parseEnv({ ...valid, APP_BASE_URL: "nie-adres" })).toThrow(/APP_BASE_URL/);
  });

  it.each([
    ["local", "outbox"],
    ["test", "outbox"],
    ["staging", "noop"],
    ["production", "noop"],
  ] as const)("MAIL_ADAPTER domyślnie przy APP_ENV=%s to %s", (appEnv, adapter) => {
    expect(parseEnv({ ...valid, APP_ENV: appEnv }).MAIL_ADAPTER).toBe(adapter);
  });

  it("bez APP_ENV (domyślnie production) MAIL_ADAPTER to noop", () => {
    const env = parseEnv(valid);

    expect(env.APP_ENV).toBe("production");
    expect(env.MAIL_ADAPTER).toBe("noop");
  });

  it("na stagingu outbox tylko po jawnym MAIL_ADAPTER=outbox", () => {
    expect(parseEnv({ ...valid, APP_ENV: "staging" }).MAIL_ADAPTER).toBe("noop");
    expect(parseEnv({ ...valid, APP_ENV: "staging", MAIL_ADAPTER: "outbox" }).MAIL_ADAPTER).toBe("outbox");
  });

  it("przyjmuje jawne MAIL_ADAPTER: noop poza produkcją i noop w produkcji", () => {
    expect(parseEnv({ ...valid, APP_ENV: "local", MAIL_ADAPTER: "noop" }).MAIL_ADAPTER).toBe("noop");
    expect(parseEnv({ ...valid, APP_ENV: "production", MAIL_ADAPTER: "noop" }).MAIL_ADAPTER).toBe("noop");
    expect(parseEnv({ ...valid, APP_ENV: "staging", MAIL_ADAPTER: "outbox" }).MAIL_ADAPTER).toBe("outbox");
  });

  it("odrzuca outbox przy APP_ENV=production — jawnym i domyślnym (fail closed)", () => {
    expect(() => parseEnv({ ...valid, APP_ENV: "production", MAIL_ADAPTER: "outbox" })).toThrow(
      /MAIL_ADAPTER: MAIL_ADAPTER=outbox jest niedozwolony przy APP_ENV=production/,
    );
    expect(() => parseEnv({ ...valid, MAIL_ADAPTER: "outbox" })).toThrow(/MAIL_ADAPTER/);
  });

  it("odrzuca MAIL_ADAPTER spoza listy", () => {
    expect(() => parseEnv({ ...valid, APP_ENV: "local", MAIL_ADAPTER: "smtp" })).toThrow(/MAIL_ADAPTER musi być jedną z/);
  });

  it.each(["local", "test"] as const)("TRUST_PROXY przy APP_ENV=%s: domyślnie false, napisy true/false → boolean", (appEnv) => {
    const local = { DATABASE_URL, AUTH_JWT_SECRET: SECRET, APP_ENV: appEnv };

    expect(parseEnv(local).TRUST_PROXY).toBe(false);
    expect(parseEnv({ ...local, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    expect(parseEnv({ ...local, TRUST_PROXY: "false" }).TRUST_PROXY).toBe(false);
  });

  it.each(["staging", "production", undefined])(
    "TRUST_PROXY przy APP_ENV=%s wymagany jako true — brak lub false blokuje start (fail closed)",
    (appEnv) => {
      const deployed = { DATABASE_URL, AUTH_JWT_SECRET: SECRET, APP_ENV: appEnv };

      expect(() => parseEnv(deployed)).toThrow(/TRUST_PROXY: TRUST_PROXY=true jest wymagany przy APP_ENV=staging i production/);
      expect(() => parseEnv({ ...deployed, TRUST_PROXY: "false" })).toThrow(/TRUST_PROXY=true jest wymagany/);
      expect(parseEnv({ ...deployed, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    },
  );

  it.each(["1", "yes", "TRUE", ""])("odrzuca TRUST_PROXY=%j", (value) => {
    expect(() => parseEnv({ ...valid, TRUST_PROXY: value })).toThrow(/TRUST_PROXY musi mieć wartość true albo false/);
  });
});
