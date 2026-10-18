import { describe, expect, it } from "vitest";
import { initOrm, isDatabaseUnavailableError, Technology } from "../src";

describe("isDatabaseUnavailableError", () => {
  it("rozpoznaje odrzucone połączenie z bazą", async () => {
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

  it("nie klasyfikuje zwykłych błędów jako niedostępności bazy", () => {
    expect(isDatabaseUnavailableError(new Error("ECONNREFUSED"))).toBe(false);
    expect(isDatabaseUnavailableError(null)).toBe(false);
  });
});
