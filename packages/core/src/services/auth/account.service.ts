import {
  UniqueConstraintViolationException,
  User,
  UserRole,
  USER_ROLES,
  type EntityManager,
} from "@devmentor/db";
import type { Role } from "../../http/auth";
import { ConflictError, UnauthorizedError } from "../../http/errors";
import { normalizeEmail } from "../../validators/auth/email.schema";
import type { LoginInput } from "../../validators/auth/login.schema";
import type { RegisterInput } from "../../validators/auth/register.schema";
import type { RateLimiter } from "../rate-limit/rate-limiter.service";
import { consumeLoginAttempt, consumeRegisterAttempt } from "./auth-rate-limits";
import type { PasswordHasher } from "./password-hasher.service";
import type { SessionSubject } from "./session-token.service";

export const EMAIL_TAKEN_MESSAGE = "Ten e-mail ma już konto";
/** Jeden komunikat dla nieznanego e-maila, złego hasła i konta bez hasła — nie zdradza, który to przypadek. */
export const INVALID_CREDENTIALS_MESSAGE = "Nieprawidłowy e-mail lub hasło";

/**
 * Konto na zewnątrz — jawna lista pól; hash hasła nigdy tu nie trafia.
 * `githubLinked` dochodzi w etapie B razem z kolumną `github_user_id`.
 */
export interface AccountDto {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  emailVerified: boolean;
  hasPassword: boolean;
}

/** Konto i dane do podpisania tokenu sesji (trasa ustawia ciasteczko przez `SessionTokenService`). */
export interface AuthenticatedAccount {
  account: AccountDto;
  session: SessionSubject;
}

export class AccountService {
  private readonly em: EntityManager;
  private readonly passwordHasher: PasswordHasher;
  private readonly rateLimiter: RateLimiter;

  constructor({ em, passwordHasher, rateLimiter }: { em: EntityManager; passwordHasher: PasswordHasher; rateLimiter: RateLimiter }) {
    this.em = em;
    this.passwordHasher = passwordHasher;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Zakłada konto z rolą `mentee` (konto i rola w jednym `flush`, czyli jednej transakcji). Zajęty adres
   * rozpoznaje constraint bazy (także indeks `lower(email)`), nie zapytanie przed zapisem — bez wyścigu.
   * Wysyłka linku weryfikacyjnego (krok 5 E01) dojdzie po zapisie.
   */
  async register(input: RegisterInput, clientIp: string): Promise<AuthenticatedAccount> {
    const email = normalizeEmail(input.email);
    consumeRegisterAttempt(this.rateLimiter, clientIp, email);

    const user = this.em.create(User, {
      email,
      displayName: input.displayName,
      passwordHash: await this.passwordHasher.hash(input.password),
      emailVerifiedAt: null,
    });
    this.em.create(UserRole, { user, role: "mentee", grantedBy: null });
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError(EMAIL_TAKEN_MESSAGE, { email: [EMAIL_TAKEN_MESSAGE] });
      }
      throw error;
    }
    return authenticated(user, ["mentee"]);
  }

  /**
   * Limiter liczy każdą próbę przed sprawdzeniem hasła. `verify` działa zawsze — dla nieistniejącego konta
   * i konta bez hasła porównuje z atrapą — więc czas odpowiedzi nie zdradza, czy konto istnieje.
   */
  async login(input: LoginInput, clientIp: string): Promise<AuthenticatedAccount> {
    const email = normalizeEmail(input.email);
    consumeLoginAttempt(this.rateLimiter, clientIp, email);

    const user = await this.em.findOne(User, { email }, { populate: ["roles"] });
    const passwordMatches = await this.passwordHasher.verify(input.password, user?.passwordHash ?? null);
    if (!user || !passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }
    return authenticated(user, rolesOf(user));
  }

  /** Własne konto zalogowanej osoby; konto usunięte w trakcie sesji → 401 (fail closed). */
  async me(userId: string): Promise<AccountDto> {
    const user = await this.em.findOne(User, { id: userId }, { populate: ["roles"] });
    if (!user) {
      throw new UnauthorizedError();
    }
    return toDto(user, rolesOf(user));
  }
}

/** Role w stałej kolejności `USER_ROLES`, niezależnie od kolejności wierszy w bazie. */
function rolesOf(user: User): Role[] {
  const granted = new Set<Role>(user.roles.getItems().map((entry) => entry.role));
  return USER_ROLES.filter((role) => granted.has(role));
}

function authenticated(user: User, roles: Role[]): AuthenticatedAccount {
  return { account: toDto(user, roles), session: { id: user.id, sessionVersion: user.sessionVersion } };
}

function toDto(user: User, roles: Role[]): AccountDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: typeof user.passwordHash === "string",
  };
}
