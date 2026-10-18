import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL musi być adresem postgresql://" }),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Waliduje zmienne środowiskowe. Wywoływane leniwie (przy pierwszym użyciu w czasie żądania),
 * żeby aplikacja budowała się bez `.env`. Komunikat błędu podaje nazwy zmiennych, nigdy wartości.
 */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Nieprawidłowa konfiguracja środowiska — ${problems}`);
  }
  return result.data;
}
