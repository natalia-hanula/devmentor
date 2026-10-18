// Konfiguracja dla CLI MikroORM (migracje). Aplikacja korzysta z `src/orm.ts`.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { createOrmConfig, requireDatabaseUrl } from "./src/config";

const rootEnv = resolve(import.meta.dirname, "../../.env");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const migrationsPath = resolve(import.meta.dirname, "migrations");

export default defineConfig({
  ...createOrmConfig({ clientUrl: requireDatabaseUrl() }),
  extensions: [Migrator],
  migrations: {
    path: migrationsPath,
    pathTs: migrationsPath,
    emit: "ts",
  },
});
