import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { entities } from "./entities";

export interface OrmConfigInput {
  /** Connection string PostgreSQL, np. `postgresql://user:pass@localhost:5432/db`. */
  clientUrl: string;
  debug?: boolean;
}

/**
 * Konfiguracja MikroORM wspólna dla aplikacji, CLI i testów.
 * Nie zawiera rozszerzenia Migrator — migracje uruchamiamy tylko z CLI.
 */
export function createOrmConfig({ clientUrl, debug = false }: OrmConfigInput): Options {
  return defineConfig({
    clientUrl,
    entities,
    debug,
    discovery: {
      // Na starcie projektu nie ma jeszcze encji domenowych.
      warnWhenNoEntities: false,
    },
  });
}

export function requireDatabaseUrl(name = "DATABASE_URL"): string {
  const url = process.env[name];
  if (!url) {
    throw new Error(`Brak zmiennej środowiskowej ${name}. Skopiuj .env.example do .env w katalogu głównym i podlinkuj go w packages/app (zob. README).`);
  }
  return url;
}
