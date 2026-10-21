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
    expect(limiter.size).toBe(1);
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

  it("przy przekroczeniu RATE_LIMIT_MAX_KEYS usuwa najstarszy wpis", () => {
    const limiter = new RateLimiter(createClock().now);
    fill(limiter, RATE_LIMIT_MAX_KEYS, SINGLE_ATTEMPT);

    limiter.consume("newcomer", SINGLE_ATTEMPT);

    expect(limiter.size).toBe(RATE_LIMIT_MAX_KEYS);
    // Najstarszy klucz zapomniany — dostaje nowe okno; drugi w kolejności nadal zablokowany.
    expect(() => limiter.consume("key-1", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("newcomer", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("key-0", SINGLE_ATTEMPT)).not.toThrow();
  });

  it("nowe okno wygasłego klucza trafia na koniec kolejki do usunięcia", () => {
    const clock = createClock();
    const limiter = new RateLimiter(clock.now);
    const shortRule: RateLimitRule = { limit: 1, windowMs: 1_000 };
    limiter.consume("renewed", shortRule);
    fill(limiter, RATE_LIMIT_MAX_KEYS - 1, SINGLE_ATTEMPT);

    clock.advance(shortRule.windowMs);
    limiter.consume("renewed", shortRule);
    limiter.consume("newcomer", SINGLE_ATTEMPT);

    expect(limiter.size).toBe(RATE_LIMIT_MAX_KEYS);
    expect(() => limiter.consume("renewed", shortRule)).toThrow(TooManyRequestsError);
    expect(() => limiter.consume("key-0", SINGLE_ATTEMPT)).not.toThrow();
  });

  it("nie rośnie ponad RATE_LIMIT_MAX_KEYS przy 10 001 unikalnych kluczach", () => {
    const limiter = new RateLimiter(createClock().now);

    fill(limiter, RATE_LIMIT_MAX_KEYS + 1, SINGLE_ATTEMPT);

    expect(limiter.size).toBe(RATE_LIMIT_MAX_KEYS);
  });

  it("gdy brakuje miejsca, najpierw sprząta wygasłe wpisy zamiast usuwać ważne", () => {
    const clock = createClock();
    const limiter = new RateLimiter(clock.now);
    const shortRule: RateLimitRule = { limit: 1, windowMs: 1_000 };
    fill(limiter, RATE_LIMIT_MAX_KEYS - 1, shortRule, "short");
    limiter.consume("long", SINGLE_ATTEMPT);

    clock.advance(shortRule.windowMs);
    limiter.consume("newcomer", SINGLE_ATTEMPT);

    expect(limiter.size).toBe(2);
    expect(() => limiter.consume("long", SINGLE_ATTEMPT)).toThrow(TooManyRequestsError);
  });
});
