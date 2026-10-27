import { getLogger, isMailOutboxEnabled, parseEnv, type Env } from "@devmentor/core";
import { connection } from "next/server";
import { NavLink } from "../_lib/nav-link";

/**
 * Pozycja „Skrzynka” — tylko gdy działa skrzynka deweloperska (`MAIL_ADAPTER=outbox`).
 * `connection()` przenosi odczyt env na czas żądania: build idzie bez `.env`, a layout
 * renderuje to pod `<Suspense>` jako jedyną dynamiczną część nawigacji (`cacheComponents`).
 */
export async function OutboxNavLink() {
  await connection();
  const env = readEnv();
  if (env === null || !isMailOutboxEnabled(env)) {
    return null;
  }
  return <NavLink href="/admin/outbox">Skrzynka</NavLink>;
}

/**
 * Zła konfiguracja nie może wywalić całego layoutu panelu — sama pozycja w nawigacji znika, a błąd
 * i tak zgłosi każda trasa API i strona sięgająca po kontener. `getLogger()` nie woła `parseEnv`,
 * więc da się zalogować; komunikat `parseEnv` podaje tylko nazwy zmiennych, nigdy wartości.
 */
function readEnv(): Env | null {
  try {
    return parseEnv();
  } catch (error) {
    getLogger().error({ err: error }, "Nieprawidłowa konfiguracja — pomijam pozycję „Skrzynka” w nawigacji");
    return null;
  }
}
