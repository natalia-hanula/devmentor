import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

/** Minimalna długość sekretu HS256 (RFC 7518 §3.2: klucz co najmniej tak długi jak skrót, 256 bitów). */
export const AUTH_JWT_SECRET_MIN_BYTES = 32;
const APP_ENVIRONMENTS = ["local", "test", "staging", "production"] as const;
const MAIL_ADAPTERS = ["outbox", "noop"] as const;
type MailAdapter = (typeof MAIL_ADAPTERS)[number];
/** Środowiska, w których skrzynka deweloperska jest domyślna; staging dostaje ją tylko jawnie. */
const OUTBOX_BY_DEFAULT: ReadonlySet<string> = new Set(["local", "test"]);
/**
 * Środowiska wdrożone za reverse proxy: bez `TRUST_PROXY=true` limiter liczyłby wszystkich klientów pod
 * jednym kluczem `"unknown"`, więc kilku użytkowników zablokowałoby logowanie wszystkim (decyzja 16, Q-IP).
 */
const TRUST_PROXY_REQUIRED: ReadonlySet<string> = new Set(["staging", "production"]);

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL musi być adresem postgresql://" }),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  AUTH_JWT_SECRET: z
    .string({ error: "AUTH_JWT_SECRET jest wymagany" })
    .refine((value) => Buffer.byteLength(value, "utf8") >= AUTH_JWT_SECRET_MIN_BYTES, {
      error: `AUTH_JWT_SECRET musi mieć co najmniej ${AUTH_JWT_SECRET_MIN_BYTES} bajty`,
    }),
  /** Linki w e-mailach i callback OAuth. */
  APP_BASE_URL: z
    .url({ protocol: /^https?$/, error: "APP_BASE_URL musi być adresem http(s)" })
    .default("http://localhost:3000"),
  /**
   * Gdzie działa aplikacja (`NODE_ENV` zostaje do Reacta i Next — `next start` zawsze ustawia `production`).
   * Domyślnie `production`: brak konfiguracji oznacza najostrzejsze reguły (fail closed).
   */
  APP_ENV: z.enum(APP_ENVIRONMENTS, { error: "APP_ENV musi być jedną z: local, test, staging, production" }).default("production"),
  /**
   * Czy przed aplikacją stoi zaufany reverse proxy, który dopisuje adres klienta na koniec
   * `x-forwarded-for`. Przy `local`/`test` domyślnie `false` (bez proxy cały nagłówek pochodzi od klienta);
   * przy `staging`/`production` wymagane `true` — sprawdza `refine` niżej.
   */
  TRUST_PROXY: z
    .enum(["true", "false"], { error: "TRUST_PROXY musi mieć wartość true albo false" })
    .optional()
    .transform((value) => value === "true"),
  /** Domyślna wartość zależy od `APP_ENV` — uzupełnia ją `transform` niżej. */
  MAIL_ADAPTER: z.enum(MAIL_ADAPTERS, { error: "MAIL_ADAPTER musi być jedną z: outbox, noop" }).optional(),
});

const envSchema = baseEnvSchema
  // Outbox pokazuje operatorowi linki weryfikacji i resetu każdego konta, więc w produkcji to droga
  // przejęcia kont — odmawiamy startu zamiast go po cichu wyłączać (fail closed).
  .refine((env) => !(env.APP_ENV === "production" && env.MAIL_ADAPTER === "outbox"), {
    path: ["MAIL_ADAPTER"],
    error: "MAIL_ADAPTER=outbox jest niedozwolony przy APP_ENV=production",
  })
  .refine((env) => env.TRUST_PROXY || !TRUST_PROXY_REQUIRED.has(env.APP_ENV), {
    path: ["TRUST_PROXY"],
    error: "TRUST_PROXY=true jest wymagany przy APP_ENV=staging i production",
  })
  .transform((env) => {
    const mailAdapter: MailAdapter = env.MAIL_ADAPTER ?? (OUTBOX_BY_DEFAULT.has(env.APP_ENV) ? "outbox" : "noop");
    return { ...env, MAIL_ADAPTER: mailAdapter };
  });

export type Env = z.output<typeof envSchema>;

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
