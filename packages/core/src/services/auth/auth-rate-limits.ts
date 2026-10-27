import type { RateLimiter, RateLimitRule } from "../rate-limit/rate-limiter.service";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Reguły limitera kont (spec E01, API Contracts → Limiter). Wartości typowe dla aplikacji tej skali,
 * do przeglądu po starcie. Limitu na sam e-mail przy logowaniu świadomie nie ma (rewizja 2 E01):
 * pozwalałby każdemu zablokować logowanie na cudze konto.
 */
export const AUTH_RATE_LIMITS = {
  loginIpEmail: { limit: 5, windowMs: FIFTEEN_MINUTES_MS },
  loginIp: { limit: 20, windowMs: FIFTEEN_MINUTES_MS },
  registerIp: { limit: 5, windowMs: ONE_HOUR_MS },
  registerEmail: { limit: 3, windowMs: ONE_HOUR_MS },
  verifyResendUser: { limit: 3, windowMs: ONE_HOUR_MS },
  tokenConfirmIp: { limit: 20, windowMs: FIFTEEN_MINUTES_MS },
} as const satisfies Record<string, RateLimitRule>;

// Spacja rozdziela IP i e-mail: nie występuje w adresie po walidacji ani w przyciętym wpisie `x-forwarded-for`.

/** Każda próba logowania (przed sprawdzeniem hasła), więc limit nie zdradza, czy hasło było poprawne. */
export function consumeLoginAttempt(rateLimiter: RateLimiter, ip: string, email: string): void {
  rateLimiter.consume(`login:ip+email:${ip} ${email}`, AUTH_RATE_LIMITS.loginIpEmail);
  rateLimiter.consume(`login:ip:${ip}`, AUTH_RATE_LIMITS.loginIp);
}

/** `register:email` nie zależy od IP — ogranicza zgadywanie zajętych adresów (409) z wielu adresów. */
export function consumeRegisterAttempt(rateLimiter: RateLimiter, ip: string, email: string): void {
  rateLimiter.consume(`register:ip:${ip}`, AUTH_RATE_LIMITS.registerIp);
  rateLimiter.consume(`register:email:${email}`, AUTH_RATE_LIMITS.registerEmail);
}

/** Ponowna wysyłka linku weryfikacyjnego — klucz to konto z sesji, więc limit nie zależy od IP. */
export function consumeVerifyResendAttempt(rateLimiter: RateLimiter, userId: string): void {
  rateLimiter.consume(`verify-resend:user:${userId}`, AUTH_RATE_LIMITS.verifyResendUser);
}

/** Każda próba użycia tokenu z linku (weryfikacja; później reset hasła i zaproszenie) — ogranicza zgadywanie. */
export function consumeTokenConfirmAttempt(rateLimiter: RateLimiter, ip: string): void {
  rateLimiter.consume(`token-confirm:ip:${ip}`, AUTH_RATE_LIMITS.tokenConfirmIp);
}
