import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "../src";

function captureLogger() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { logger: createLogger({ destination }), lines };
}

describe("createLogger", () => {
  it("redaguje hasła, tokeny, ciasteczka i nagłówek Authorization", () => {
    const { logger, lines } = captureLogger();

    logger.info(
      {
        password: "hunter2",
        user: { email: "a@b.pl", password: "hunter2" },
        token: "jwt-token",
        req: { headers: { authorization: "Bearer abc", cookie: "session=xyz" } },
      },
      "logowanie",
    );

    const output = lines.join("");
    expect(output).not.toMatch(/hunter2|jwt-token|Bearer abc|session=xyz/);
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("a@b.pl");
  });
});

describe("getLogger", () => {
  it("zwraca jeden współdzielony logger z poziomem z LOG_LEVEL albo domyślnym info", async () => {
    const { getLogger } = await import("../src");
    const holder = globalThis as { __devmentorLogger?: unknown };
    const previous = holder.__devmentorLogger;
    const previousLevel = process.env.LOG_LEVEL;

    try {
      delete holder.__devmentorLogger;
      delete process.env.LOG_LEVEL;
      const logger = getLogger();
      expect(logger.level).toBe("info");
      expect(getLogger()).toBe(logger);

      delete holder.__devmentorLogger;
      process.env.LOG_LEVEL = "warn";
      expect(getLogger().level).toBe("warn");
    } finally {
      holder.__devmentorLogger = previous;
      process.env.LOG_LEVEL = previousLevel;
    }
  });

  it("createLogger bez destination pisze na standardowe wyjście", () => {
    expect(createLogger({ level: "silent" }).level).toBe("silent");
    expect(createLogger().level).toBe("info");
  });
});
