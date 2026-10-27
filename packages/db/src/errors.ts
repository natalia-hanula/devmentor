import { ConnectionException, DriverException } from "@mikro-orm/postgresql";

/** Kody błędów sieciowych Node.js oznaczające, że serwer bazy jest nieosiągalny. */
const NETWORK_ERROR_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH"]);

/** Klasa SQLSTATE 08 — „connection exception” w PostgreSQL. */
const SQLSTATE_CONNECTION_CLASS = "08";

/**
 * Czy błąd oznacza niedostępność bazy (a nie błąd zapytania czy danych).
 * MikroORM 7 łączy się leniwie, więc taki błąd pojawia się dopiero przy pierwszym zapytaniu.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof ConnectionException) {
    return true;
  }
  if (!(error instanceof Error) || !("code" in error) || typeof error.code !== "string") {
    return false;
  }
  // Kod sieciowy także na surowym błędzie sterownika: `flush` (początek transakcji) nie opakowuje go
  // w `DriverException`, a przy `localhost` (IPv4 + IPv6) to `AggregateError` z pustym komunikatem.
  if (NETWORK_ERROR_CODES.has(error.code)) {
    return true;
  }
  return error instanceof DriverException && error.code.startsWith(SQLSTATE_CONNECTION_CLASS);
}
