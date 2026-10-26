import {
  UniqueConstraintViolationException,
  User,
  UserRole,
  USER_ROLES,
  type EntityManager,
} from "@devmentor/db";
import type { Env } from "../../config/env";
import type { Role } from "../../http/auth";
import { parseInput } from "../../http/api-handler";
import { ConflictError, UnauthorizedError, ValidationError } from "../../http/errors";
import type { Logger } from "../../logger";
import { normalizeEmail } from "../../validators/auth/email.schema";
import type { LoginInput } from "../../validators/auth/login.schema";
import { registerSchema, type RegisterInput } from "../../validators/auth/register.schema";
import { INVALID_LINK_MESSAGE } from "../../validators/auth/token-confirm.schema";
import type { MailGateway } from "../mail/mail.port";
import type { RateLimiter } from "../rate-limit/rate-limiter.service";
import { verificationMail } from "./auth-mail";
import {
  consumeLoginAttempt,
  consumeRegisterAttempt,
  consumeTokenConfirmAttempt,
  consumeVerifyResendAttempt,
} from "./auth-rate-limits";
import type { PasswordHasher } from "./password-hasher.service";
import type { SessionSubject } from "./session-token.service";
import { EMAIL_VERIFICATION_TTL_MS, type UserTokenService } from "./user-token.service";

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

/**
 * Wynik potwierdzenia adresu. `email` to adres potwierdzonego konta — strona porównuje go z kontem
 * zalogowanym, bo link mógł należeć do innego konta (L23).
 */
export interface EmailVerificationResult {
  emailVerified: true;
  email: string;
}

export interface AccountServiceDependencies {
  em: EntityManager;
  passwordHasher: PasswordHasher;
  rateLimiter: RateLimiter;
  userTokenService: UserTokenService;
  mailGateway: MailGateway;
  logger: Logger;
  env: Pick<Env, "APP_BASE_URL">;
}

/** Dane konta operatora z CLI — surowe, serwis waliduje je tymi samymi regułami co rejestrację. */
export type OperatorInput = Pick<RegisterInput, "email" | "displayName" | "password">;

/** Konto i dane do podpisania tokenu sesji (trasa ustawia ciasteczko przez `SessionTokenService`). */
export interface AuthenticatedAccount {
  account: AccountDto;
  session: SessionSubject;
}

export class AccountService {
  private readonly em: EntityManager;
  private readonly passwordHasher: PasswordHasher;
  private readonly rateLimiter: RateLimiter;
  private readonly userTokenService: UserTokenService;
  private readonly mailGateway: MailGateway;
  private readonly logger: Logger;
  private readonly appBaseUrl: string;

  constructor({ em, passwordHasher, rateLimiter, userTokenService, mailGateway, logger, env }: AccountServiceDependencies) {
    this.em = em;
    this.passwordHasher = passwordHasher;
    this.rateLimiter = rateLimiter;
    this.userTokenService = userTokenService;
    this.mailGateway = mailGateway;
    this.logger = logger;
    this.appBaseUrl = env.APP_BASE_URL;
  }

  /**
   * Zakłada konto z rolą `mentee` i tokenem weryfikacji e-maila — wszystko w jednym `flush`, czyli jednej
   * transakcji: nie powstanie konto bez tokenu (bez linku do czasu ponownej wysyłki) ani token bez konta.
   * Zajęty adres rozpoznaje constraint bazy (także indeks `lower(email)`), nie zapytanie przed zapisem.
   * Mail z linkiem wychodzi dopiero po zapisie; jego błąd nie psuje rejestracji (konto i sesja zostają).
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
    const rawToken = this.userTokenService.issueForNewUser(user, "email_verification", EMAIL_VERIFICATION_TTL_MS);
    await flushNewAccount(this.em);
    await this.sendVerificationMail(user, rawToken);
    return authenticated(user, ["mentee"]);
  }

  /**
   * Konto operatora — wyłącznie z CLI (`npm run operator:create`), więc bez limitera, maila i tokenów.
   * Wejście nie przeszło przez walidator trasy, dlatego serwis parsuje je schematem rejestracji
   * (normalizacja e-maila, długość hasła, nazwa). Rola tylko `operator` (Q17), adres od razu potwierdzony.
   * Zajęty adres rozpoznaje constraint bazy, nie zapytanie przed zapisem.
   */
  async createOperator(input: OperatorInput): Promise<AccountDto> {
    const { email, displayName, password } = parseInput(registerSchema, input);

    const user = this.em.create(User, {
      email,
      displayName,
      passwordHash: await this.passwordHasher.hash(password),
      emailVerifiedAt: new Date(),
    });
    this.em.create(UserRole, { user, role: "operator", grantedBy: null });
    await flushNewAccount(this.em);
    return toAccountDto(user, ["operator"]);
  }

  /**
   * Nowy link weryfikacyjny dla własnego konta. Limiter liczy każde żądanie. Potwierdzony adres → nic nie
   * wysyła (odpowiedź jak przy wysyłce). Nowy token zastępuje poprzedni (upsert), więc stary link przestaje działać.
   */
  async resendVerification(userId: string): Promise<void> {
    consumeVerifyResendAttempt(this.rateLimiter, userId);

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new UnauthorizedError();
    }
    if (user.emailVerifiedAt !== null) {
      return;
    }
    const rawToken = await this.userTokenService.issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);
    await this.sendVerificationMail(user, rawToken);
  }

  /**
   * Potwierdza adres konta, do którego należy token — niezależnie od sesji (L23). Zły, wygasły, zużyty albo
   * cudzego celu token → jeden komunikat (L14). Zużycie to atomowe `DELETE … RETURNING`, więc link działa
   * raz; potem usuwamy wszystkie tokeny konta (także ewentualny reset hasła z etapu B).
   */
  async verifyEmail(rawToken: string, clientIp: string): Promise<EmailVerificationResult> {
    consumeTokenConfirmAttempt(this.rateLimiter, clientIp);

    const userId = await this.userTokenService.consume(rawToken, "email_verification");
    if (userId === null) {
      throw new ValidationError(INVALID_LINK_MESSAGE);
    }
    // Konto usunięte między zużyciem tokenu a odczytem — ten sam komunikat.
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new ValidationError(INVALID_LINK_MESSAGE);
    }
    if (user.emailVerifiedAt === null) {
      user.emailVerifiedAt = new Date();
      await this.em.flush();
    }
    await this.userTokenService.deleteAllForUser(user.id);
    return { emailVerified: true, email: user.email };
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
    return toAccountDto(user, rolesOf(user));
  }

  /**
   * Wysyłka po zapisie (port e-mail: nigdy dla wycofanej transakcji). Błąd poczty logujemy bez adresata,
   * treści i tokenu, a odpowiedź pozostaje sukcesem — nowy link można wysłać z `/account`.
   */
  private async sendVerificationMail(user: User, rawToken: string): Promise<void> {
    try {
      await this.mailGateway.send(verificationMail({ to: user.email, appBaseUrl: this.appBaseUrl, rawToken }));
    } catch (error) {
      this.logger.error(
        { err: error, userId: user.id, mail: "email_verification" },
        "Nie udało się wysłać linku weryfikacyjnego",
      );
    }
  }
}

/** Role w stałej kolejności `USER_ROLES`, niezależnie od kolejności wierszy w bazie. */
function rolesOf(user: User): Role[] {
  const granted = new Set<Role>(user.roles.getItems().map((entry) => entry.role));
  return USER_ROLES.filter((role) => granted.has(role));
}

function authenticated(user: User, roles: Role[]): AuthenticatedAccount {
  return { account: toAccountDto(user, roles), session: { id: user.id, sessionVersion: user.sessionVersion } };
}

/**
 * Zapis nowego konta; naruszenie unikalności e-maila (constraint, także `lower(email)`) → 409 przy polu `email`.
 * Wspólne z kontami testowymi `SeedService` (ta sama ścieżka co rejestracja).
 */
export async function flushNewAccount(em: EntityManager): Promise<void> {
  try {
    await em.flush();
  } catch (error) {
    if (error instanceof UniqueConstraintViolationException) {
      throw new ConflictError(EMAIL_TAKEN_MESSAGE, { email: [EMAIL_TAKEN_MESSAGE] });
    }
    throw error;
  }
}

export function toAccountDto(user: User, roles: Role[]): AccountDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: typeof user.passwordHash === "string",
  };
}
