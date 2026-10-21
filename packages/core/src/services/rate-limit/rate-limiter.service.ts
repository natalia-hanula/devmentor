import { TooManyRequestsError } from "../../http/errors";

/**
 * Górny limit śledzonych kluczy. Klucze pochodzą od klienta (IP, e-mail), więc bez limitu zalew
 * unikalnych kluczy wyczerpałby pamięć procesu. 10 000 wpisów to pojedyncze megabajty, a przy
 * jednej instancji (Q6) z zapasem mieści ruch prawdziwych użytkowników w jednym oknie.
 */
export const RATE_LIMIT_MAX_KEYS = 10_000;

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Limiter prób z oknem stałym, liczniki w pamięci procesu (jedna instancja, Q6). Reguły (nazwane
 * stałe) definiuje konsument. Kolejność wstawiania do `Map` to kolejność otwarcia okna, więc
 * pierwszy wpis jest najstarszy.
 */
export class RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly now: () => number;

  /**
   * Zegar jako zwykły parametr, nie obiekt zależności: w trybie `PROXY` + `strict` Awilix rzuciłby
   * przy odczycie niezarejestrowanego `now`, dlatego kontener tworzy instancję przez `asFunction`.
   */
  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Liczba śledzonych kluczy — pozwala sprawdzić, że pamięć limitera jest ograniczona. */
  get size(): number {
    return this.entries.size;
  }

  /** Zalicza próbę dla `key`; po wyczerpaniu `rule.limit` w oknie rzuca `TooManyRequestsError`. */
  consume(key: string, rule: RateLimitRule): void {
    const now = this.now();
    const entry = this.entries.get(key);

    if (entry !== undefined && entry.resetAt > now) {
      if (entry.count >= rule.limit) {
        throw new TooManyRequestsError();
      }
      entry.count += 1;
      return;
    }

    // Wygasły wpis usuwamy, żeby nowe okno trafiło na koniec kolejności „od najstarszego”.
    this.entries.delete(key);
    this.makeRoom(now);
    this.entries.set(key, { count: 1, resetAt: now + rule.windowMs });
  }

  private makeRoom(now: number): void {
    if (this.entries.size < RATE_LIMIT_MAX_KEYS) {
      return;
    }
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
    if (this.entries.size < RATE_LIMIT_MAX_KEYS) {
      return;
    }
    const [oldestKey] = this.entries.keys();
    this.entries.delete(oldestKey);
  }
}
