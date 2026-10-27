import {
  ConflictError,
  isDatabaseUnavailableError,
  ServiceUnavailableError,
  ValidationError,
  type AccountDto,
  type OperatorInput,
} from "@devmentor/core";
import { InputClosedError, type OperatorTerminal } from "./terminal.ts";

/** Zakładanie konta i sprzątanie po nim — w produkcji `withScope` i `closeContainer`, w testach atrapa. */
export interface OperatorBackend {
  createOperator(input: OperatorInput): Promise<AccountDto>;
  /** Zamyka pulę połączeń ORM, żeby proces mógł się zakończyć. */
  close(): Promise<void>;
}

export const RESET_PASSWORD_FLAG = "--reset-password";

export const MESSAGES = {
  usage: [
    "Użycie: npm run operator:create",
    "Skrypt nie przyjmuje argumentów — pyta o e-mail, wyświetlaną nazwę i hasło (hasło bez echa, nigdy w historii powłoki).",
  ],
  resetUnavailable: [
    "Reset hasła operatora (--reset-password) nie jest jeszcze dostępny — wejdzie w etapie B.",
    "Jeśli nie pamiętasz hasła, załóż nowe konto operatora: npm run operator:create",
  ],
  intro: "Nowe konto operatora DevMentor (rola: operator, adres e-mail od razu potwierdzony).",
  email: "E-mail: ",
  displayName: "Wyświetlana nazwa: ",
  password: "Hasło (min. 12 znaków, wpisywane bez echa): ",
  passwordRepeat: "Powtórz hasło: ",
  passwordMismatch: "Hasła różnią się — konto nie zostało utworzone. Uruchom skrypt ponownie.",
  cancelled: "Przerwano — konto nie zostało utworzone.",
  inputEnded: "Wejście skończyło się przed podaniem wszystkich danych — konto nie zostało utworzone.",
  invalid: "Nie utworzono konta operatora — popraw dane:",
  databaseUnavailable:
    "Baza danych jest niedostępna — konto nie zostało utworzone. Uruchom bazę (npm run db:up) i sprawdź DATABASE_URL w .env.",
  unexpected: "Nie udało się utworzyć konta operatora:",
  closeFailed: "uwaga: nie udało się zamknąć połączenia z bazą:",
  created: (email: string) => `Utworzono konto operatora ${email}. Zaloguj się na /login.`,
} as const;

/** Etykiety pól w komunikatach błędów — w kolejności pytań. */
const FIELD_LABELS: Record<string, string> = {
  email: "E-mail",
  displayName: "Wyświetlana nazwa",
  password: "Hasło",
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

/** Błędy pól w kolejności pytań; pola spoza listy na końcu. */
function fieldRank(field: string): number {
  const index = FIELD_ORDER.indexOf(field);
  return index === -1 ? FIELD_ORDER.length : index;
}

/**
 * `npm run operator:create`: pyta o dane, zakłada konto przez serwis i zwraca kod wyjścia (0 sukces, 1 błąd).
 * Hasło nigdy nie jest argumentem ani nie trafia na wyjście — także w komunikatach błędów.
 */
export async function runCreateOperator(
  args: readonly string[],
  terminal: OperatorTerminal,
  backend: OperatorBackend,
): Promise<number> {
  try {
    return await run(args, terminal, backend);
  } finally {
    terminal.close();
    await closeBackend(backend, terminal);
  }
}

async function run(args: readonly string[], terminal: OperatorTerminal, backend: OperatorBackend): Promise<number> {
  if (args.includes(RESET_PASSWORD_FLAG)) {
    MESSAGES.resetUnavailable.forEach((line) => terminal.write(line));
    return 1;
  }
  if (args.length > 0) {
    MESSAGES.usage.forEach((line) => terminal.write(line));
    return 1;
  }

  terminal.write(MESSAGES.intro);
  const input = await readInput(terminal);
  if (typeof input === "string") {
    terminal.write(input);
    return 1;
  }

  try {
    const account = await backend.createOperator(input);
    terminal.write(MESSAGES.created(account.email));
    return 0;
  } catch (error) {
    reportFailure(error, terminal);
    return 1;
  }
}

/** Dane z terminala albo komunikat, dlaczego ich nie ma (przerwanie, koniec wejścia, różne hasła). */
async function readInput(terminal: OperatorTerminal): Promise<OperatorInput | string> {
  try {
    const email = await terminal.ask(MESSAGES.email);
    const displayName = await terminal.ask(MESSAGES.displayName);
    const password = await terminal.askHidden(MESSAGES.password);
    const repeated = await terminal.askHidden(MESSAGES.passwordRepeat);
    if (password !== repeated) {
      return MESSAGES.passwordMismatch;
    }
    return { email, displayName, password };
  } catch (error) {
    if (error instanceof InputClosedError) {
      return error.reason === "cancelled" ? MESSAGES.cancelled : MESSAGES.inputEnded;
    }
    throw error;
  }
}

function reportFailure(error: unknown, terminal: OperatorTerminal): void {
  if (error instanceof ValidationError || error instanceof ConflictError) {
    terminal.write(MESSAGES.invalid);
    const entries = Object.entries(error.fieldErrors ?? { _form: [error.message] });
    entries.sort(([a], [b]) => fieldRank(a) - fieldRank(b));
    for (const [field, messages] of entries) {
      const label = FIELD_LABELS[field];
      messages.forEach((message) => terminal.write(label ? `  ${label}: ${message}` : `  ${message}`));
    }
    return;
  }
  if (error instanceof ServiceUnavailableError || isDatabaseUnavailableError(error)) {
    terminal.write(MESSAGES.databaseUnavailable);
    return;
  }
  // Komunikaty błędów nie zawierają hasła: serwis przekazuje do bazy tylko jego hash.
  terminal.write(`${MESSAGES.unexpected} ${errorMessage(error)}`);
}

/** Błąd przy zamykaniu puli nie zmienia wyniku — tylko go zgłaszamy. */
async function closeBackend(backend: OperatorBackend, terminal: OperatorTerminal): Promise<void> {
  try {
    await backend.close();
  } catch (error) {
    terminal.write(`${MESSAGES.closeFailed} ${errorMessage(error)}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
