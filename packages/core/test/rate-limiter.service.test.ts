import { describe, expect, it } from "vitest";
import { RATE_LIMIT_MAX_KEYS, RateLimiter, TooManyRequestsError, type RateLimitRule } from "../src";

const RULE: RateLimitRule = { limit: 3, windowMs: 60_000 };
const SINGLE_ATTEMPT: RateLimitRule = { limit: 1, windowMs: 60_000 };

function createClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function fill(limiter: RateLimiter, count: number, rule: RateLimitRule, prefix = "key") {
  for (let index = 0; index < count; index += 1) {
    limiter.consume(`${prefix}-${index}`, rule);
  }
}

describe("RateLimiter", () => {
  it("przepuszcza `limit` prób w oknie, a kolejną odrzuca TooManyRequestsError", () => {
    const limiter = new RateLimiter(createClock().now);

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      expect(() => limiter.consume("login:1.2.3.4", RULE)).not.toThrow();
    }

    expect(() => limiter.consume("login:1.2.3.4", RULE)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("login:1.2.3.4", RULE)).toThrow(TooManyRequestsError);
  });

  it("zeruje licznik dopiero po upływie okna", () => {
    const clock = createClock();
    const limiter = new RateLimiter(clock.now);
    fill(limiter, 1, SINGLE_ATTEMPT);

    clock.advance(SINGLE_ATTEMPT.windowMs - 1);
    expect(() => limiter.consume("key-0", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);

    clock.advance(1);
    expect(() => limiter.consume("key-0", SINGLE_ATTEMPT)).not.toThrow();
    expect(() => limiter.consume("key-0", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });

  it("liczy każdy klucz osobno", () => {
    const limiter = new RateLimiter(createClock().now);
    limiter.consume("register:a@example.com", SINGLE_ATTEMPT);

    expect(() => limiter.consume("register:b@example.com", SINGLE_ATTEMPT)).not.toThrow();
    expect(() => limiter.consume("register:a@example.com", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });

  it("domyślnie używa zegara systemowego", () => {
    const limiter = new RateLimiter();
    limiter.consume("key", SINGLE_ATTEMPT);

    expect(() => limiter.consume("key", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });

  it("pełna tablica bez wygasłych wpisów: nowy klucz dostaje 429, aktywna blokada nie znika", () => {
    const limiter = new RateLimiter(createClock().now);
    limiter.consume("login:victim@example.com", SINGLE_ATTEMPT);
    fill(limiter, RATE_LIMIT_MAX_KEYS - 1, SINGLE_ATTEMPT, "flood");

    expect(() => limiter.consume("newcomer", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("flood-new", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    // Zalew kluczy nie zdjął blokady ofiary (pierwszy, najstarszy wpis).
    expect(() => limiter.consume("login:victim@example.com", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });

  it("pełna tablica: istniejący klucz działa normalnie — liczy próby i dostaje nowe okno po wygaśnięciu", () => {
    const clock = createClock();
    const limiter = new RateLimiter(clock.now);
    const shortRule: RateLimitRule = { limit: 2, windowMs: 1_000 };
    limiter.consume("known", shortRule);
    fill(limiter, RATE_LIMIT_MAX_KEYS - 1, SINGLE_ATTEMPT);

    expect(() => limiter.consume("known", shortRule)).not.toThrow();
    expect(() => limiter.consume("known", shortRule)).toThrow(TooManyRequestsError);

    clock.advance(shortRule.windowMs);
    expect(() => limiter.consume("known", shortRule)).not.toThrow();
    expect(() => limiter.consume("newcomer", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });

  it("pełna tablica z wygasłymi wpisami: sprząta je i przyjmuje nowy klucz, ważne wpisy zostają", () => {
    const clock = createClock();
    const limiter = new RateLimiter(clock.now);
    const shortRule: RateLimitRule = { limit: 1, windowMs: 1_000 };
    limiter.consume("long", SINGLE_ATTEMPT);
    fill(limiter, RATE_LIMIT_MAX_KEYS - 1, shortRule, "short");

    clock.advance(shortRule.windowMs);

    expect(() => limiter.consume("newcomer", SINGLE_ATTEMPT)).not.toThrow();
    expect(() => limiter.consume("newcomer", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("long", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    // Po sprzątaniu jest miejsce na kolejne nowe klucze.
    expect(() => fill(limiter, RATE_LIMIT_MAX_KEYS - 2, SINGLE_ATTEMPT, "next")).not.toThrow();
    expect(() => limiter.consume("one-too-many", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });
});
