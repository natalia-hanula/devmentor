import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ENV, APP_ENV_TARGET, appEnvLinkStep, envFileStep } from "../../setup/steps/env-file.ts";
import { contextFor, fakeSystem, ROOT } from "../fake-system.ts";

const ENV = join(ROOT, ".env");
const LINK = join(ROOT, APP_ENV);

describe("envFileStep", () => {
  it("kopiuje .env.example, gdy .env nie istnieje", async () => {
    const system = fakeSystem();

    const result = await envFileStep.run(contextFor(system));

    expect(system.copyFile).toHaveBeenCalledWith(join(ROOT, ".env.example"), ENV);
    expect(result.status).toBe("done");
  });

  it("nigdy nie nadpisuje istniejącego .env", async () => {
    const system = fakeSystem();
    system.paths.set(ENV, "file");

    const result = await envFileStep.run(contextFor(system));

    expect(system.copyFile).not.toHaveBeenCalled();
    expect(result.status).toBe("skipped");
  });
});

describe("appEnvLinkStep", () => {
  it("tworzy symlink do głównego .env, gdy go nie ma", async () => {
    const system = fakeSystem();

    const result = await appEnvLinkStep.run(contextFor(system));

    expect(system.symlink).toHaveBeenCalledWith(APP_ENV_TARGET, LINK);
    expect(result.status).toBe("done");
  });

  it("pomija poprawny symlink, także „wiszący”", async () => {
    const system = fakeSystem();
    system.paths.set(LINK, "symlink");
    system.links.set(LINK, APP_ENV_TARGET);

    const result = await appEnvLinkStep.run(contextFor(system));

    expect(system.symlink).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", message: `${APP_ENV} wskazuje na ${APP_ENV_TARGET}` });
  });

  it.each([
    ["symlink w inne miejsce", "symlink", "../inny/.env"],
    ["zwykły plik", "file", undefined],
  ] as const)("zostawia %s bez zmian i ostrzega", async (_, kind, target) => {
    const system = fakeSystem();
    system.paths.set(LINK, kind);
    if (target) system.links.set(LINK, target);

    const result = await appEnvLinkStep.run(contextFor(system));

    expect(system.symlink).not.toHaveBeenCalled();
    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/^uwaga: .*ln -s/);
  });
});
