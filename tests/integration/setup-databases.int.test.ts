import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { CONNECT_TIMEOUT_MS, ensureDatabases, MAINTENANCE_DATABASE } from "../../scripts/setup/steps/database.ts";
import { connect } from "../../scripts/setup/system.ts";
import type { DatabaseClient } from "../../scripts/setup/types.ts";

// Unikalna nazwa — test nie dotyka baz aplikacji ani bazy testów integracyjnych.
const DATABASE = `it_setup_${Date.now()}`;

describe("instalator: tworzenie baz na prawdziwym PostgreSQL", () => {
  let client: DatabaseClient;

  beforeAll(async () => {
    const url = new URL(inject("databaseUrl"));
    url.pathname = `/${MAINTENANCE_DATABASE}`;
    client = await connect(url.href, CONNECT_TIMEOUT_MS);
  });

  afterAll(async () => {
    await client.query(`DROP DATABASE IF EXISTS ${client.escapeIdentifier(DATABASE)}`);
    await client.end();
  });

  it("tworzy brakującą bazę, a przy drugim wywołaniu ją pomija", async () => {
    await expect(ensureDatabases(client, [DATABASE])).resolves.toEqual([DATABASE]);
    await expect(ensureDatabases(client, [DATABASE])).resolves.toEqual([]);

    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE]);
    expect(result.rowCount).toBe(1);
  });
});
