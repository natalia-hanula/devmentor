import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { initOrm } from "@devmentor/db";

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const POSTGRES_IMAGE = "postgres:17-alpine";

export interface TestDatabase {
  url: string;
  stop: () => Promise<void>;
}

/**
 * Tymczasowy PostgreSQL. W CI — kontener testcontainers. Lokalnie bez Dockera można wskazać
 * istniejącą, przeznaczoną na testy bazę w `INTEGRATION_DATABASE_URL` — jej schemat zostanie wyczyszczony.
 */
export async function startDatabase(): Promise<TestDatabase> {
  const externalUrl = process.env.INTEGRATION_DATABASE_URL;
  if (externalUrl) {
    await resetSchema(externalUrl);
    return { url: externalUrl, stop: async () => undefined };
  }

  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase("devmentor")
    .withUsername("devmentor")
    .withPassword("devmentor")
    .start();
  return {
    url: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}

/** Wykonuje migracje tym samym CLI, którego używamy na co dzień — przy okazji testuje same migracje. */
export async function migrate(databaseUrl: string): Promise<void> {
  await execFileAsync("npm", ["run", "migration:up", "-w", "@devmentor/db"], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function resetSchema(databaseUrl: string): Promise<void> {
  const orm = await initOrm(databaseUrl);
  try {
    await orm.em.execute("drop schema if exists public cascade; create schema public;");
  } finally {
    await orm.close(true);
  }
}
