import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ENV, APP_ENV_TARGET, appEnvLinkStep, envFileStep, sessionEnvStep } from "../../setup/steps/env-file.ts";
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

describe("sessionEnvStep", () => {
  const withEnv = (content: string) => {
    const system = fakeSystem();
    system.files.set(ENV, content);
    return system;
  };

  it("dopisuje sekret i APP_ENV=local, nie ruszając pozostałych wartości", async () => {
    const system = withEnv("DATABASE_URL=postgresql://u:p@localhost/db\nLOG_LEVEL=debug\n");

    const result = await sessionEnvStep.run(contextFor(system));

    expect(system.files.get(ENV)).toBe(
      "DATABASE_URL=postgresql://u:p@localhost/db\nLOG_LEVEL=debug\nAUTH_JWT_SECRET=wygenerowany-sekret\nAPP_ENV=local\n",
    );
    expect(result).toEqual({ status: "done", message: "dopisano do .env: AUTH_JWT_SECRET, APP_ENV" });
  });

  it("dodaje znak nowej linii, gdy plik nie kończy się nim, i obsługuje pusty plik", async () => {
    const noNewline = withEnv("A=1");
    const empty = withEnv("");

    await sessionEnvStep.run(contextFor(noNewline));
    await sessionEnvStep.run(contextFor(empty));

    expect(noNewline.files.get(ENV)).toBe("A=1\nAUTH_JWT_SECRET=wygenerowany-sekret\nAPP_ENV=local\n");
    expect(empty.files.get(ENV)).toBe("AUTH_JWT_SECRET=wygenerowany-sekret\nAPP_ENV=local\n");
  });

  it("ignoruje zakomentowany wpis z .env.example i go nie zmienia", async () => {
    const system = withEnv("APP_ENV=local\n# AUTH_JWT_SECRET=\n");

    const result = await sessionEnvStep.run(contextFor(system));

    expect(system.files.get(ENV)).toBe("APP_ENV=local\n# AUTH_JWT_SECRET=\nAUTH_JWT_SECRET=wygenerowany-sekret\n");
    expect(result.message).toBe("dopisano do .env: AUTH_JWT_SECRET");
  });

  it("wypełnia pusty wpis w miejscu, bez drugiego wiersza", async () => {
    const system = withEnv("AUTH_JWT_SECRET=\nAPP_ENV=staging\n");

    await sessionEnvStep.run(contextFor(system));

    expect(system.files.get(ENV)).toBe("AUTH_JWT_SECRET=wygenerowany-sekret\nAPP_ENV=staging\n");
  });

  it("jest idempotentny: istniejących wartości (też własnego APP_ENV) nie zmienia i nie zapisuje pliku", async () => {
    const content = "AUTH_JWT_SECRET=moj-wlasny-sekret\nAPP_ENV=production\n";
    const system = withEnv(content);

    const result = await sessionEnvStep.run(contextFor(system));

    expect(system.writeFile).not.toHaveBeenCalled();
    expect(system.files.get(ENV)).toBe(content);
    expect(result).toEqual({ status: "skipped", message: "AUTH_JWT_SECRET i APP_ENV są już w .env" });
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
