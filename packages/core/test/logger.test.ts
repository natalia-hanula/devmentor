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
