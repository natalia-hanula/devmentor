import { User, UserRole, type EntityManager } from "@devmentor/db";
import type { Env } from "../../config/env";
import { parseInput } from "../../http/api-handler";
import type { Role } from "../../http/auth";
import { ForbiddenError, NotFoundError } from "../../http/errors";
import { normalizeEmail } from "../../validators/auth/email.schema";
import { registerSchema } from "../../validators/auth/register.schema";
import {
  flushNewAccount,
  toAccountDto,
  type AccountDto,
  type AccountService,
  type OperatorInput,
} from "../auth/account.service";
import type { PasswordHasher } from "../auth/password-hasher.service";

export const SEED_FORBIDDEN_MESSAGE = "Konta testowe (npm run db:seed) są zablokowane przy APP_ENV=production";

/** Dane konta testowego — te same pola i reguły co przy rejestracji. */
export type TestAccountInput = OperatorInput;

export interface SeedServiceDependencies {
  em: EntityManager;
  passwordHasher: PasswordHasher;
  accountService: AccountService;
  env: Pick<Env, "APP_ENV">;
}

/**
 * Konta testowe dla `npm run db:seed` — wyłącznie poza produkcją. Każda metoda sprawdza `APP_ENV` sama
 * (fail closed), niezależnie od skryptu. Bez trasy HTTP, limitera, tokenów i maila: adresy są od razu
 * potwierdzone (wyjątek: mentee z `emailVerified: false` do sprawdzania banera i „Wyślij ponownie”), a skrzynka
 * outbox żyje w pamięci innego procesu (`next dev`), więc mail z seeda by przepadł.
 * Zajęty adres → `ConflictError` z constraintu (jak przy rejestracji), więc ponowny seed niczego nie dubluje.
 */
export class SeedService {
  private readonly em: EntityManager;
  private readonly passwordHasher: PasswordHasher;
  private readonly accountService: AccountService;
  private readonly appEnv: Env["APP_ENV"];

  constructor({ em, passwordHasher, accountService, env }: SeedServiceDependencies) {
    this.em = em;
    this.passwordHasher = passwordHasher;
    this.accountService = accountService;
    this.appEnv = env.APP_ENV;
  }

  /** Operator tą samą drogą co CLI (`AccountService.createOperator`): tylko rola `operator`, adres potwierdzony. */
  async createOperator(input: TestAccountInput): Promise<AccountDto> {
    this.assertNotProduction();
    return this.accountService.createOperator(input);
  }

  /**
   * Mentee jak po rejestracji (walidacja, normalizacja, hash, rola `mentee`), ale bez tokenu i maila.
   * `emailVerified: false` → adres niepotwierdzony; link weryfikacyjny daje dopiero „Wyślij ponownie” w aplikacji.
   */
  async createMentee(input: TestAccountInput, emailVerified: boolean): Promise<AccountDto> {
    this.assertNotProduction();
    return this.createAccount(input, null, emailVerified);
  }

  /**
   * Mentor ma zawsze też rolę `mentee`. Rolę `mentor` nadaje istniejące konto operatora (`granted_by`) —
   * do czasu zaproszeń (faza 4) to jedyna droga do konta mentora.
   */
  async createMentor(input: TestAccountInput, grantedByEmail: string): Promise<AccountDto> {
    this.assertNotProduction();
    const operator = await this.em.findOne(User, { email: normalizeEmail(grantedByEmail) }, { populate: ["roles"] });
    if (!operator || !operator.roles.getItems().some((entry) => entry.role === "operator")) {
      throw new NotFoundError(`Brak konta operatora ${grantedByEmail} — nie można nadać roli mentora`);
    }
    return this.createAccount(input, operator, true);
  }

  private assertNotProduction(): void {
    if (this.appEnv === "production") {
      throw new ForbiddenError(SEED_FORBIDDEN_MESSAGE);
    }
  }

  /** `mentorGrantedBy` = operator nadający rolę mentora; `null` → samo konto mentee. */
  private async createAccount(
    input: TestAccountInput,
    mentorGrantedBy: User | null,
    emailVerified: boolean,
  ): Promise<AccountDto> {
    const { email, displayName, password } = parseInput(registerSchema, input);

    const user = this.em.create(User, {
      email,
      displayName,
      passwordHash: await this.passwordHasher.hash(password),
      emailVerifiedAt: emailVerified ? new Date() : null,
    });
    const roles: Role[] = ["mentee"];
    this.em.create(UserRole, { user, role: "mentee", grantedBy: null });
    if (mentorGrantedBy) {
      this.em.create(UserRole, { user, role: "mentor", grantedBy: mentorGrantedBy });
      roles.push("mentor");
    }
    await flushNewAccount(this.em);
    return toAccountDto(user, roles);
  }
}
