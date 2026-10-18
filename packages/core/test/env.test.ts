import { describe, expect, it } from "vitest";
import { parseEnv } from "../src";

describe("parseEnv", () => {
  it("uzupełnia wartości domyślne", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db" });

    expect(env).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      LOG_LEVEL: "info",
    });
  });

  it("odrzuca brakujący lub nie-postgresowy DATABASE_URL, nie ujawniając wartości", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://secret-pass@host/db" })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://secret-pass@host/db" })).not.toThrow(/secret-pass/);
  });
});
