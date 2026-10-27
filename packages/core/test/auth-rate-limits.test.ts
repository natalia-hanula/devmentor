import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMITS,
  consumeLoginAttempt,
  consumeRegisterAttempt,
  consumeTokenConfirmAttempt,
  consumeVerifyResendAttempt,
  RateLimiter,
  TooManyRequestsError,
} from "../src";

const MINUTE_MS = 60 * 1000;

function exhaust(times: number, attempt: () => void): void {
  for (let i = 0; i < times; i += 1) {
    attempt();
  }
}

describe("reguły limitera kont", () => {
  it("wartości ze spec E01", () => {
    expect(AUTH_RATE_LIMITS).toEqual({
      loginIpEmail: { limit: 5, windowMs: 15 * MINUTE_MS },
      loginIp: { limit: 20, windowMs: 15 * MINUTE_MS },
      registerIp: { limit: 5, windowMs: 60 * MINUTE_MS },
      registerEmail: { limit: 3, windowMs: 60 * MINUTE_MS },
      verifyResendUser: { limit: 3, windowMs: 60 * MINUTE_MS },
      tokenConfirmIp: { limit: 20, windowMs: 15 * MINUTE_MS },
    });
  });

  it("login:ip+email — szósta próba z tego samego IP na ten sam e-mail → 429; inny e-mail z tego IP przechodzi", () => {
    const limiter = new RateLimiter(() => 0);
    exhaust(5, () => consumeLoginAttempt(limiter, "203.0.113.1", "ola@example.com"));

    expect(() => consumeLoginAttempt(limiter, "203.0.113.1", "ola@example.com")).toThrow(TooManyRequestsError);
    expect(() => consumeLoginAttempt(limiter, "203.0.113.1", "jan@example.com")).not.toThrow();
    expect(() => consumeLoginAttempt(limiter, "203.0.113.2", "ola@example.com")).not.toThrow();
  });

  it("login:ip — 21. próba z jednego IP (różne e-maile) → 429, inne IP przechodzi", () => {
    const limiter = new RateLimiter(() => 0);
    for (let i = 0; i < 20; i += 1) {
      consumeLoginAttempt(limiter, "203.0.113.1", `konto${i}@example.com`);
    }

    expect(() => consumeLoginAttempt(limiter, "203.0.113.1", "nowe@example.com")).toThrow(TooManyRequestsError);
    expect(() => consumeLoginAttempt(limiter, "203.0.113.9", "nowe@example.com")).not.toThrow();
  });

  it("login — limity wracają po 15 minutach", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    exhaust(5, () => consumeLoginAttempt(limiter, "203.0.113.1", "ola@example.com"));

    now = 15 * MINUTE_MS;
    expect(() => consumeLoginAttempt(limiter, "203.0.113.1", "ola@example.com")).not.toThrow();
  });

  it("register:ip — szósta rejestracja z jednego IP w godzinie → 429", () => {
    const limiter = new RateLimiter(() => 0);
    for (let i = 0; i < 5; i += 1) {
      consumeRegisterAttempt(limiter, "203.0.113.1", `konto${i}@example.com`);
    }

    expect(() => consumeRegisterAttempt(limiter, "203.0.113.1", "nowe@example.com")).toThrow(TooManyRequestsError);
  });

  it("register:email — czwarta próba na ten sam adres w godzinie → 429 niezależnie od IP", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    consumeRegisterAttempt(limiter, "203.0.113.1", "ola@example.com");
    consumeRegisterAttempt(limiter, "203.0.113.2", "ola@example.com");
    consumeRegisterAttempt(limiter, "203.0.113.3", "ola@example.com");

    expect(() => consumeRegisterAttempt(limiter, "203.0.113.4", "ola@example.com")).toThrow(TooManyRequestsError);

    now = 60 * MINUTE_MS;
    expect(() => consumeRegisterAttempt(limiter, "203.0.113.4", "ola@example.com")).not.toThrow();
  });

  it("verify-resend:user — czwarta prośba konta w godzinie → 429, inne konto przechodzi, po godzinie znowu można", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    exhaust(3, () => consumeVerifyResendAttempt(limiter, "konto-a"));

    expect(() => consumeVerifyResendAttempt(limiter, "konto-a")).toThrow(TooManyRequestsError);
    expect(() => consumeVerifyResendAttempt(limiter, "konto-b")).not.toThrow();

    now = 60 * MINUTE_MS;
    expect(() => consumeVerifyResendAttempt(limiter, "konto-a")).not.toThrow();
  });

  it("token-confirm:ip — 21. próba z jednego IP w 15 minut → 429, inne IP przechodzi", () => {
    const limiter = new RateLimiter(() => 0);
    exhaust(20, () => consumeTokenConfirmAttempt(limiter, "203.0.113.1"));

    expect(() => consumeTokenConfirmAttempt(limiter, "203.0.113.1")).toThrow(TooManyRequestsError);
    expect(() => consumeTokenConfirmAttempt(limiter, "203.0.113.2")).not.toThrow();
  });
});
