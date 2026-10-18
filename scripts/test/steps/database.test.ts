import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONNECT_TIMEOUT_MS,
  connectStep,
  databasesStep,
  databaseUrlStep,
  ensureDatabases,
  INTEGRATION_DATABASE,
  migrationsStep,
} from "../../setup/steps/database.ts";
import type { SetupContext } from "../../setup/types.ts";
import { contextFor, fakeClient, fakeSystem, pgError, ROOT } from "../fake-system.ts";

const URL_WITH_PASSWORD = "postgresql://devmentor:sekret@localhost:5432/devmentor";

function withDatabase(url = URL_WITH_PASSWORD, name = "devmentor"): SetupContext {
  return contextFor(fakeSystem(), { database: { url: new URL(url), name } });
}

describe("databaseUrlStep", () => {
  it("bierze DATABASE_URL ze zmiennej środowiskowej przed plikiem .env", async () => {
    const system = fakeSystem({ env: { DATABASE_URL: URL_WITH_PASSWORD } });
    system.files.set(join(ROOT, ".env"), "DATABASE_URL=postgresql://inny@host/inna\n");
    const context = contextFor(system);

    const result = await databaseUrlStep.run(context);

    expect(context.database?.name).toBe("devmentor");
    expect(result).toEqual({ status: "done", message: "localhost:5432/devmentor" });
    expect(result.message).not.toContain("sekret");
  });

  it("czyta DATABASE_URL z głównego .env i dekoduje nazwę bazy", async () => {
    const system = fakeSystem();
    system.files.set(join(ROOT, ".env"), "# komentarz\nDATABASE_URL=postgres://u@db.local/dev%5Fmentor\n");
    const context = contextFor(system);

    const result = await databaseUrlStep.run(context);

    expect(context.database?.name).toBe("dev_mentor");
    expect(result.message).toBe("db.local:5432/dev_mentor");
  });

  it.each([
    ["brak zmiennej", "INNA=1\n", "brak DATABASE_URL"],
    ["nie URL", "DATABASE_URL=nie-adres\n", "musi być adresem postgresql://"],
    ["inny protokół", "DATABASE_URL=mysql://u@localhost/devmentor\n", "musi być adresem postgresql://"],
    ["niebezpieczna nazwa bazy", 'DATABASE_URL=postgresql://u@localhost/dev";drop\n', "tylko małe litery"],
  ])("odrzuca konfigurację: %s", async (_, content, expected) => {
    const system = fakeSystem();
    system.files.set(join(ROOT, ".env"), content);
    const context = contextFor(system);

    const result = await databaseUrlStep.run(context);

    expect(result).toEqual({ status: "failed", message: expect.stringContaining(expected) });
    expect(context.database).toBeUndefined();
  });
});

describe("connectStep", () => {
  it("łączy się z bazą konserwacyjną z limitem czasu i zapamiętuje klienta", async () => {
    const context = withDatabase();
    const client = fakeClient();
    const connect = context.system.connect as ReturnType<typeof fakeSystem>["connect"];
    connect.mockResolvedValue(client);

    const result = await connectStep.run(context);

    expect(connect).toHaveBeenCalledWith("postgresql://devmentor:sekret@localhost:5432/postgres", CONNECT_TIMEOUT_MS);
    expect(context.client).toBe(client);
    expect(result).toEqual({ status: "done", message: "odpowiada pod localhost:5432" });
  });

  it.each([
    ["złe hasło", pgError("28P01"), "odrzuca rolę devmentor"],
    ["brak roli", pgError("28000"), "odrzuca rolę devmentor"],
    ["brak bazy postgres", pgError("3D000"), "nie ma bazy postgres"],
    ["odmowa połączenia", pgError("ECONNREFUSED"), "nie odpowiada pod localhost:5432"],
    ["limit czasu", new Error("Connection terminated due to connection timeout"), "nie odpowiada pod localhost:5432"],
    ["inny błąd", pgError(42, "coś innego"), "nie udało się połączyć z PostgreSQL pod localhost:5432: coś innego"],
    ["wyjątek nie-Error", "napis", "nie udało się połączyć z PostgreSQL pod localhost:5432: napis"],
  ])("rozróżnia przyczynę: %s", async (_, error, expected) => {
    const context = withDatabase();
    (context.system.connect as ReturnType<typeof fakeSystem>["connect"]).mockRejectedValue(error);

    const result = await connectStep.run(context);

    expect(result).toEqual({ status: "failed", message: expect.stringContaining(expected) });
    expect(result.message).not.toContain("sekret");
    expect(context.client).toBeUndefined();
  });

  it("wymaga wcześniejszego kroku DATABASE_URL", async () => {
    await expect(connectStep.run(contextFor(fakeSystem()))).rejects.toThrow("krok DATABASE_URL musi poprzedzać");
  });
});

describe("databasesStep", () => {
  it("pomija bazy, które już istnieją", async () => {
    const context = withDatabase();
    context.client = fakeClient(["devmentor", INTEGRATION_DATABASE]);

    const result = await databasesStep.run(context);

    expect(result).toEqual({ status: "skipped", message: `istnieją: devmentor, ${INTEGRATION_DATABASE}` });
  });

  it("tworzy brakującą bazę testową przy istniejącej głównej", async () => {
    const context = withDatabase();
    const client = fakeClient(["devmentor"]);
    context.client = client;

    const result = await databasesStep.run(context);

    expect(client.query).toHaveBeenCalledWith(`CREATE DATABASE "${INTEGRATION_DATABASE}"`);
    expect(result).toEqual({ status: "done", message: `utworzono: ${INTEGRATION_DATABASE}` });
  });

  it("nie dubluje bazy, gdy DATABASE_URL wskazuje bazę testową", async () => {
    const context = withDatabase(`postgresql://u@localhost/${INTEGRATION_DATABASE}`, INTEGRATION_DATABASE);
    const client = fakeClient();
    context.client = client;

    await databasesStep.run(context);

    expect(client.query.mock.calls.filter(([sql]) => sql.startsWith("CREATE"))).toHaveLength(1);
  });

  it("podpowiada CREATEDB, gdy rola nie może tworzyć baz", async () => {
    const context = withDatabase();
    const client = fakeClient();
    client.query.mockImplementation(async (sql) => {
      if (sql.startsWith("CREATE")) throw pgError("42501");
      return { rowCount: 0 };
    });
    context.client = client;

    const result = await databasesStep.run(context);

    expect(result).toEqual({ status: "failed", message: expect.stringContaining("rola devmentor nie może tworzyć baz") });
  });

  it("przekazuje dalej nieoczekiwany błąd bazy", async () => {
    const context = withDatabase();
    const client = fakeClient();
    client.query.mockRejectedValue(new Error("połączenie zerwane"));
    context.client = client;

    await expect(databasesStep.run(context)).rejects.toThrow("połączenie zerwane");
  });

  it("wymaga wcześniejszego połączenia", async () => {
    await expect(databasesStep.run(withDatabase())).rejects.toThrow("krok PostgreSQL musi poprzedzać");
  });
});

describe("ensureDatabases", () => {
  it("traktuje bazę utworzoną równolegle (42P04) jako istniejącą", async () => {
    const client = fakeClient();
    client.query.mockImplementation(async (sql) => {
      if (sql.startsWith("CREATE")) throw pgError("42P04");
      return { rowCount: null };
    });

    await expect(ensureDatabases(client, ["a"])).resolves.toEqual([]);
  });
});

describe("migrationsStep", () => {
  it("uruchamia migracje MikroORM", async () => {
    const system = fakeSystem();

    const result = await migrationsStep.run(contextFor(system));

    expect(system.run).toHaveBeenCalledWith("npm", ["run", "db:migrate"]);
    expect(result.status).toBe("done");
  });

  it("zgłasza błąd migracji", async () => {
    const system = fakeSystem();
    system.run.mockResolvedValue(2);

    const result = await migrationsStep.run(contextFor(system));

    expect(result).toEqual({ status: "failed", message: "npm run db:migrate zakończył się kodem 2." });
  });
});
