import {
  ConflictError,
  ForbiddenError,
  isDatabaseUnavailableError,
  ServiceUnavailableError,
  type AccountDto,
  type Env,
  type TestAccountInput,
} from "@devmentor/core";
import { TEST_ACCOUNTS, TEST_PASSWORD, type TestAccount } from "./test-accounts.ts";

/** Zakładanie kont i sprzątanie — w produkcji `withScope` (osobny scope na konto) i `closeContainer`, w testach atrapa. */
export interface SeedBackend {
  /** `APP_ENV` z `parseEnv()` — brak wpisu w `.env` oznacza `production`. */
  appEnv(): Env["APP_ENV"];
  createOperator(input: TestAccountInput): Promise<AccountDto>;
  createMentee(input: TestAccountInput, emailVerified: boolean): Promise<AccountDto>;
  createMentor(input: TestAccountInput, grantedByEmail: string): Promise<AccountDto>;
  /** Zamyka pulę połączeń ORM, żeby proces mógł się zakończyć. */
  close(): Promise<void>;
}

export type WriteLine = (line: string) => void;

/** „e-mail (role)”, przy niepotwierdzonym adresie z dopiskiem — do linii wyjścia. */
function describeAccount(account: TestAccount): string {
  const details = account.emailVerified ? account.roles : [...account.roles, "adres niepotwierdzony"];
  return `${account.email} (${details.join(", ")})`;
}

export const MESSAGES = {
  production:
    "Odmowa: npm run db:seed zakłada konta testowe ze znanym hasłem i nie działa przy APP_ENV=production (brak APP_ENV w .env też oznacza production).",
  intro: "Konta testowe DevMentor:",
  created: (account: TestAccount) => `  ${describeAccount(account)} — utworzone`,
  skipped: (account: TestAccount) => `  ${describeAccount(account)} — już istnieje, pomijam`,
  password: `Hasło wszystkich kont testowych: ${TEST_PASSWORD} (dane testowe, nie sekret)`,
  databaseUnavailable:
    "Baza danych jest niedostępna — seed przerwany. Uruchom bazę (npm run db:up) i sprawdź DATABASE_URL w .env.",
  unexpected: "Seed przerwany — nie udało się założyć kont testowych:",
  closeFailed: "uwaga: nie udało się zamknąć połączenia z bazą:",
} as const;

/**
 * `npm run db:seed`: zakłada konta operatora, mentee, mentora i mentee z niepotwierdzonym adresem i zwraca kod wyjścia (0 sukces, 1 błąd).
 * Operator pierwszy, bo nadaje rolę mentora (`granted_by`). Istniejące konto → „już istnieje”, dalej.
 */
export async function runSeed(write: WriteLine, backend: SeedBackend): Promise<number> {
  try {
    return await seed(write, backend);
  } catch (error) {
    reportFailure(error, write);
    return 1;
  } finally {
    await closeBackend(backend, write);
  }
}

async function seed(write: WriteLine, backend: SeedBackend): Promise<number> {
  if (backend.appEnv() === "production") {
    write(MESSAGES.production);
    return 1;
  }

  const { operator, mentee, mentor, menteeUnverified } = TEST_ACCOUNTS;
  const steps: [TestAccount, () => Promise<AccountDto>][] = [
    [operator, () => backend.createOperator(input(operator))],
    [mentee, () => backend.createMentee(input(mentee), mentee.emailVerified)],
    [mentor, () => backend.createMentor(input(mentor), operator.email)],
    [menteeUnverified, () => backend.createMentee(input(menteeUnverified), menteeUnverified.emailVerified)],
  ];

  write(MESSAGES.intro);
  for (const [account, create] of steps) {
    write((await createdOrExisting(create)) ? MESSAGES.created(account) : MESSAGES.skipped(account));
  }
  write(MESSAGES.password);
  return 0;
}

function input(account: TestAccount): TestAccountInput {
  return { email: account.email, displayName: account.displayName, password: TEST_PASSWORD };
}

/** `true` — konto założone; `false` — adres już zajęty (konflikt z constraintu). Inne błędy przerywają seed. */
async function createdOrExisting(create: () => Promise<AccountDto>): Promise<boolean> {
  try {
    await create();
    return true;
  } catch (error) {
    if (error instanceof ConflictError) {
      return false;
    }
    throw error;
  }
}

function reportFailure(error: unknown, write: WriteLine): void {
  if (error instanceof ForbiddenError) {
    write(MESSAGES.production);
    return;
  }
  if (error instanceof ServiceUnavailableError || isDatabaseUnavailableError(error)) {
    write(MESSAGES.databaseUnavailable);
    return;
  }
  write(`${MESSAGES.unexpected} ${errorMessage(error)}`);
}

/** Błąd przy zamykaniu puli nie zmienia wyniku — tylko go zgłaszamy. */
async function closeBackend(backend: SeedBackend, write: WriteLine): Promise<void> {
  try {
    await backend.close();
  } catch (error) {
    write(`${MESSAGES.closeFailed} ${errorMessage(error)}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
