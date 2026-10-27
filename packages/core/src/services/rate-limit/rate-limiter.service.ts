import { TooManyRequestsError } from "../../http/errors";

/**
 * Górny limit śledzonych kluczy. Klucze pochodzą od klienta (IP, e-mail), więc bez limitu zalew
 * unikalnych kluczy wyczerpałby pamięć procesu. 10 000 wpisów to pojedyncze megabajty, a przy
 * jednej instancji (Q6) z zapasem mieści ruch prawdziwych użytkowników w jednym oknie. Gdy tablica
 * jest pełna i nic w niej nie wygasło, nowy klucz dostaje 429 (fail closed) — aktywnych wpisów nie
 * wyrzucamy, bo zalew kluczy zdjąłby wtedy blokadę z atakowanego konta.
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
 * stałe) definiuje konsument.
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

  /**
   * Zalicza próbę dla `key`; po wyczerpaniu `rule.limit` w oknie rzuca `TooManyRequestsError`.
   * Rzuca go też dla nowego klucza, gdy tablica jest pełna aktywnych wpisów (`RATE_LIMIT_MAX_KEYS`).
   */
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

    // Wygasły wpis tego klucza zwalnia miejsce, więc znany klucz zawsze dostaje nowe okno.
    this.entries.delete(key);
    this.makeRoom(now);
    this.entries.set(key, { count: 1, resetAt: now + rule.windowMs });
  }

  /** Usuwa tylko wygasłe wpisy; jeśli to nie zwolni miejsca, odmawia (fail closed). */
  private makeRoom(now: number): void {
    if (this.entries.size < RATE_LIMIT_MAX_KEYS) {
      return;
    }
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
    if (this.entries.size >= RATE_LIMIT_MAX_KEYS) {
      throw new TooManyRequestsError();
    }
  }
}
