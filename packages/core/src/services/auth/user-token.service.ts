import { createHash, randomBytes } from "node:crypto";
import { UserToken, type EntityManager, type USER_TOKEN_PURPOSES } from "@devmentor/db";

export type UserTokenPurpose = (typeof USER_TOKEN_PURPOSES)[number];

/** Ważność linku weryfikacyjnego (spec E01, Data Model `user_tokens`: `EMAIL_VERIFICATION_TTL = 24 h`). */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/** 256 bitów losowości — tokenu nie da się zgadnąć, a jego SHA-256 bez soli wystarcza do wyszukania w bazie. */
const RAW_TOKEN_BYTES = 32;
/** Kolumna FK konta w `user_tokens` (natywny builder operuje na kolumnach, nie na właściwościach encji). */
const USER_ID_COLUMN = "user_id";

export function generateRawToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString("base64url");
}

/** W bazie trzymamy tylko SHA-256 (hex) — wyciek tabeli nie daje działających linków. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Jednorazowe tokeny kont (weryfikacja e-maila; reset hasła w etapie B). Zegar aplikacji (`now`) liczy zarówno
 * `expires_at` przy wydaniu, jak i granicę ważności przy zużyciu — jedno źródło czasu, bez rozjazdu zegarów
 * aplikacji i bazy, a wygaśnięcie da się sprawdzić w testach bez czekania.
 */
export class UserTokenService {
  private readonly em: EntityManager;
  private readonly now: () => number;

  // `now` jako osobny parametr: w trybie PROXY + strict Awilix rzuciłby przy odczycie niezarejestrowanego `now`.
  constructor({ em }: { em: EntityManager }, now: () => number = Date.now) {
    this.em = em;
    this.now = now;
  }

  /**
   * Wydaje nowy token i zwraca jego surową postać (do linku). Upsert po UNIQUE (`user_id`, `purpose`):
   * poprzedni token tego celu przestaje działać w tym samym poleceniu, a dwa równoczesne wydania zostawiają jeden.
   */
  async issue(userId: string, purpose: UserTokenPurpose, ttlMs: number): Promise<string> {
    const rawToken = generateRawToken();
    const now = this.now();
    await this.em.upsert(
      UserToken,
      {
        user: userId,
        purpose,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(now + ttlMs),
        updatedAt: new Date(now),
      },
      {
        onConflictFields: ["user", "purpose"],
        onConflictAction: "merge",
        onConflictMergeFields: ["tokenHash", "expiresAt", "updatedAt"],
      },
    );
    return rawToken;
  }

  /**
   * Zużywa ważny token danego celu i zwraca ID konta; `null` dla tokenu nieznanego, zużytego, wygasłego
   * albo o innym celu. Jedno `DELETE … RETURNING` — z dwóch równoczesnych zużyć udaje się dokładnie jedno.
   */
  async consume(rawToken: string, purpose: UserTokenPurpose): Promise<string | null> {
    // MikroORM 7 po cichu pomija `.returning()` w DELETE z QueryBuildera (dokleja RETURNING tylko do INSERT/UPDATE),
    // więc RETURNING dokładamy na natywnym builderze tego samego zapytania — nadal z parametrami, bez sklejania SQL.
    const query = this.em
      .createQueryBuilder(UserToken)
      .delete({ tokenHash: hashToken(rawToken), purpose, expiresAt: { $gt: new Date(this.now()) } })
      .getNativeQuery()
      .returning([USER_ID_COLUMN]);
    const rows = await this.em.execute<{ [USER_ID_COLUMN]?: unknown }[]>(query);
    const userId = rows[0]?.[USER_ID_COLUMN];
    return typeof userId === "string" ? userId : null;
  }

  /** Usuwa wszystkie tokeny konta (np. po potwierdzeniu e-maila). */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.em.nativeDelete(UserToken, { user: userId });
  }
}
