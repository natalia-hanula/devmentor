import { join } from "node:path";
import { parseEnv } from "node:util";
import type { DatabaseClient, SetupContext, SetupStep } from "../types.ts";
import { ROOT_ENV } from "./env-file.ts";

/** Baza testów integracyjnych — ta sama nazwa co w README, `.env.example` i `docker/postgres/init`. */
export const INTEGRATION_DATABASE = "devmentor_integration";
/** Baza konserwacyjna, z którą łączymy się, zanim istnieje baza aplikacji. */
export const MAINTENANCE_DATABASE = "postgres";
/** Domyślny limit `pg` to 0 (czekanie bez końca) — przy zerwanym połączeniu instalator by zawisł. */
export const CONNECT_TIMEOUT_MS = 5000;

/** Nazwa bazy trafia do `CREATE DATABASE` (bez parametrów), więc dopuszczamy tylko bezpieczne identyfikatory. */
const DATABASE_NAME = /^[a-z_][a-z0-9_]*$/;

const PG_DUPLICATE_DATABASE = "42P04";
const PG_INSUFFICIENT_PRIVILEGE = "42501";
const PG_INVALID_PASSWORD = "28P01";
const PG_INVALID_AUTHORIZATION = "28000";
const PG_INVALID_CATALOG = "3D000";
const UNREACHABLE_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH"]);

const START_POSTGRES_HINT =
  "Uruchom PostgreSQL ręcznie (README → „Uruchomienie lokalne”, krok 2): " +
  "`brew services start postgresql@17` (Homebrew) albo `docker compose up -d` (Docker).";

export const databaseUrlStep: SetupStep = {
  name: "DATABASE_URL",
  async run(context) {
    const { system } = context;
    const raw = system.env.DATABASE_URL ?? parseEnv(system.readFile(join(system.rootDir, ROOT_ENV))).DATABASE_URL;
    if (!raw) {
      return { status: "failed", message: "brak DATABASE_URL w .env — uzupełnij go według .env.example." };
    }
    const url = URL.parse(raw);
    if (!url || (url.protocol !== "postgres:" && url.protocol !== "postgresql:")) {
      return { status: "failed", message: "DATABASE_URL musi być adresem postgresql://…" };
    }
    const name = decodeURIComponent(url.pathname.slice(1));
    if (!DATABASE_NAME.test(name)) {
      return {
        status: "failed",
        message: "nazwa bazy w DATABASE_URL może zawierać tylko małe litery, cyfry i _ (i nie zaczynać się cyfrą).",
      };
    }
    context.database = { url, name };
    return { status: "done", message: `${hostPort(url)}/${name}` };
  },
};

export const connectStep: SetupStep = {
  name: "PostgreSQL",
  async run(context) {
    const { url } = requireDatabase(context);
    const maintenance = new URL(url);
    maintenance.pathname = `/${MAINTENANCE_DATABASE}`;
    try {
      context.client = await context.system.connect(maintenance.href, CONNECT_TIMEOUT_MS);
    } catch (error) {
      return { status: "failed", message: connectionFailure(error, url) };
    }
    return { status: "done", message: `odpowiada pod ${hostPort(url)}` };
  },
};

export const databasesStep: SetupStep = {
  name: "Bazy danych",
  async run(context) {
    const { name, url } = requireDatabase(context);
    const client = requireClient(context);
    const names = [...new Set([name, INTEGRATION_DATABASE])];
    try {
      const created = await ensureDatabases(client, names);
      if (created.length === 0) {
        return { status: "skipped", message: `istnieją: ${names.join(", ")}` };
      }
      return { status: "done", message: `utworzono: ${created.join(", ")}` };
    } catch (error) {
      if (pgCode(error) === PG_INSUFFICIENT_PRIVILEGE) {
        return {
          status: "failed",
          message:
            `rola ${roleName(url)} nie może tworzyć baz — nadaj jej uprawnienie ` +
            "(`ALTER ROLE <rola> CREATEDB;`) albo utwórz bazy ręcznie (README → „Uruchomienie lokalne”, krok 2).",
        };
      }
      throw error;
    }
  },
};

export const migrationsStep: SetupStep = {
  name: "Migracje",
  async run({ system }) {
    const exitCode = await system.run("npm", ["run", "db:migrate"]);
    if (exitCode !== 0) {
      return { status: "failed", message: `npm run db:migrate zakończył się kodem ${exitCode}.` };
    }
    return { status: "done", message: "schemat aktualny (wykonane migracje MikroORM pomija)" };
  },
};

/**
 * Tworzy brakujące bazy i zwraca nazwy utworzonych. Jawny wyjątek od reguły „zapytania tylko przez
 * MikroORM” (spec A9): `CREATE DATABASE` nie ma odpowiednika w API encji.
 */
export async function ensureDatabases(client: DatabaseClient, names: readonly string[]): Promise<string[]> {
  const created: string[] = [];
  for (const name of names) {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (existing.rowCount) continue;
    try {
      await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
      created.push(name);
    } catch (error) {
      // Równoległe uruchomienie zdążyło utworzyć bazę między sprawdzeniem a CREATE.
      if (pgCode(error) !== PG_DUPLICATE_DATABASE) throw error;
    }
  }
  return created;
}

function connectionFailure(error: unknown, url: URL): string {
  const code = pgCode(error);
  const role = roleName(url);
  if (code === PG_INVALID_PASSWORD || code === PG_INVALID_AUTHORIZATION) {
    return (
      `PostgreSQL odpowiada pod ${hostPort(url)}, ale odrzuca rolę ${role} (złe hasło albo brak roli). ` +
      "Utwórz rolę według README → „Uruchomienie lokalne”, krok 2, albo popraw DATABASE_URL w .env."
    );
  }
  if (code === PG_INVALID_CATALOG) {
    return `PostgreSQL pod ${hostPort(url)} nie ma bazy ${MAINTENANCE_DATABASE} — utwórz ją ręcznie albo użyj wariantu Docker z README.`;
  }
  if ((code && UNREACHABLE_CODES.has(code)) || /timeout/i.test(errorMessage(error))) {
    return `PostgreSQL nie odpowiada pod ${hostPort(url)}. ${START_POSTGRES_HINT}`;
  }
  return `nie udało się połączyć z PostgreSQL pod ${hostPort(url)}: ${errorMessage(error)}. ${START_POSTGRES_HINT}`;
}

/** Rola z `DATABASE_URL`; bez nazwy `pg` łączy się jako użytkownik systemu. */
function roleName(url: URL): string {
  return decodeURIComponent(url.username) || "(domyślna rola systemowa)";
}

/** Host i port bez danych logowania — `DATABASE_URL` zawiera hasło. */
function hostPort(url: URL): string {
  return `${url.hostname}:${url.port || "5432"}`;
}

function requireDatabase(context: SetupContext) {
  if (!context.database) throw new Error("brak DATABASE_URL — krok DATABASE_URL musi poprzedzać ten krok.");
  return context.database;
}

function requireClient(context: SetupContext) {
  if (!context.client) throw new Error("brak połączenia — krok PostgreSQL musi poprzedzać ten krok.");
  return context.client;
}

function pgCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
