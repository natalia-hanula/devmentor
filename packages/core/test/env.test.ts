import { describe, expect, it } from "vitest";
import { parseEnv } from "../src";

const DATABASE_URL = "postgresql://u:p@localhost:5432/db";
const SECRET = "s".repeat(32);
const valid = { DATABASE_URL, AUTH_JWT_SECRET: SECRET };

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
});
