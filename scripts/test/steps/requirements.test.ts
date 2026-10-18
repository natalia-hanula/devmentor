import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareVersions, MIN_NODE_VERSION, nodeVersionStep, platformStep } from "../../setup/steps/requirements.ts";
import { contextFor, fakeSystem } from "../fake-system.ts";

describe("platformStep", () => {
  it("odsyła użytkownika Windows do ręcznych kroków", async () => {
    const result = await platformStep.run(contextFor(fakeSystem({ platform: "win32" })));

    expect(result).toEqual({ status: "failed", message: expect.stringContaining("README → „Uruchomienie lokalne”") });
  });

  it.each(["darwin", "linux"])("przepuszcza %s", async (platform) => {
    const result = await platformStep.run(contextFor(fakeSystem({ platform })));

    expect(result.status).toBe("done");
  });
});

describe("nodeVersionStep", () => {
  it("odrzuca Node starszy niż wymagany", async () => {
    const result = await nodeVersionStep.run(contextFor(fakeSystem({ nodeVersion: "22.16.0" })));

    expect(result).toEqual({ status: "failed", message: expect.stringContaining(`${MIN_NODE_VERSION} lub nowszy`) });
  });

  it.each([MIN_NODE_VERSION, "24.19.0"])("przepuszcza Node %s", async (nodeVersion) => {
    const result = await nodeVersionStep.run(contextFor(fakeSystem({ nodeVersion })));

    expect(result).toEqual({ status: "done", message: `wersja ${nodeVersion}` });
  });

  it("minimalna wersja zgadza się z engines.node w package.json", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));

    expect(manifest.engines.node).toMatch(/^>=/);
    expect(compareVersions(manifest.engines.node.slice(2), MIN_NODE_VERSION)).toBe(0);
  });
});

describe("compareVersions", () => {
  it("porównuje części liczbowo, a brakujące traktuje jak zero", () => {
    expect(compareVersions("22.9.0", "22.17.0")).toBeLessThan(0);
    expect(compareVersions("23.0.0", "22.17.0")).toBeGreaterThan(0);
    expect(compareVersions("22.17", "22.17.0")).toBe(0);
    expect(compareVersions("22.17.0", "22.17")).toBe(0);
  });
});
