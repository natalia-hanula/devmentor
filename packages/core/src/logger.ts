import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

export type { Logger };

/** Pola, które nigdy nie mogą trafić do logów (hasła, tokeny, ciasteczka, nagłówki autoryzacji). */
export const LOG_REDACT_PATHS = [
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "jwt",
  "*.jwt",
  "secret",
  "*.secret",
  "cookie",
  "*.cookie",
  "authorization",
  "*.authorization",
  "headers.authorization",
  "headers.cookie",
  "*.headers.authorization",
  "*.headers.cookie",
  "set-cookie",
  "*.set-cookie",
  // Dane osobowe i pełne adresy (mogą nieść tokeny w query stringu).
  "email",
  "*.email",
  "url",
  "*.url",
];

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"];
  destination?: DestinationStream;
}

export function createLogger({ level = "info", destination }: CreateLoggerOptions = {}): Logger {
  const options: LoggerOptions = {
    level,
    redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" },
  };
  return destination ? pino(options, destination) : pino(options);
}

const globalForLogger = globalThis as unknown as { __devmentorLogger?: Logger };

/** Współdzielony logger procesu (ten sam, który kontener rejestruje jako `logger`). */
export function getLogger(): Logger {
  globalForLogger.__devmentorLogger ??= createLogger({
    level: process.env.LOG_LEVEL ?? "info",
  });
  return globalForLogger.__devmentorLogger;
}
