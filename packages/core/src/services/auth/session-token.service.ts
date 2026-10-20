import { errors, jwtVerify, SignJWT } from "jose";
import type { Env } from "../../config/env";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "../../http/session-constants";

const SESSION_ALGORITHM = "HS256";
/** Środowiska, w których ciasteczko dostaje flagę `Secure` (`NODE_ENV` ich nie odróżnia). */
const SECURE_COOKIE_ENVIRONMENTS: readonly Env["APP_ENV"][] = ["staging", "production"];

export interface SessionSubject {
  id: string;
  sessionVersion: number;
}

export interface VerifiedSessionToken {
  userId: string;
  sessionVersion: number;
}

/**
 * Podpis i weryfikacja tokenu sesji (JWT HS256) oraz budowa ciasteczka. Token niesie tylko
 * `sub` (userId), `sv` (wersję sesji) i `exp`; role i stan konta czytamy z bazy przy każdym żądaniu.
 */
export class SessionTokenService {
  private readonly key: Uint8Array;
  private readonly secure: boolean;

  constructor({ env }: { env: Pick<Env, "AUTH_JWT_SECRET" | "APP_ENV"> }) {
    this.key = new TextEncoder().encode(env.AUTH_JWT_SECRET);
    this.secure = SECURE_COOKIE_ENVIRONMENTS.includes(env.APP_ENV);
  }

  sign(subject: SessionSubject): Promise<string> {
    return new SignJWT({ sv: subject.sessionVersion })
      .setProtectedHeader({ alg: SESSION_ALGORITHM })
      .setSubject(subject.id)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
      .sign(this.key);
  }

  /** `null` dla każdego tokenu, który nie jest ważny; błąd inny niż walidacja tokenu leci dalej. */
  async verify(token: string): Promise<VerifiedSessionToken | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [SESSION_ALGORITHM] });
      const { sub, sv } = payload;
      if (typeof sub !== "string" || sub === "" || typeof sv !== "number" || !Number.isInteger(sv)) {
        return null;
      }
      return { userId: sub, sessionVersion: sv };
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        return null;
      }
      throw error;
    }
  }

  buildSessionCookie(token: string): string {
    return this.cookie(token, SESSION_TTL_SECONDS);
  }

  clearSessionCookie(): string {
    return this.cookie("", 0);
  }

  private cookie(value: string, maxAgeSeconds: number): string {
    const attributes = [`${SESSION_COOKIE_NAME}=${value}`, "Path=/", `Max-Age=${maxAgeSeconds}`, "HttpOnly", "SameSite=Lax"];
    if (this.secure) {
      attributes.push("Secure");
    }
    return attributes.join("; ");
  }
}
