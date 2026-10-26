import { ConflictError, ServiceUnavailableError, ValidationError, type AccountDto, type OperatorInput } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";
import { MESSAGES, runCreateOperator, type OperatorBackend } from "../../operator/run-create-operator.ts";
import { InputClosedError, type OperatorTerminal } from "../../operator/terminal.ts";

const PASSWORD = "tajne-haslo-operatora";
const ANSWERS = ["  Admin@Example.com ", "Operatorka", PASSWORD, PASSWORD];

const ACCOUNT: AccountDto = {
  id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b",
  email: "admin@example.com",
  displayName: "Operatorka",
  roles: ["operator"],
  emailVerified: true,
  hasPassword: true,
};

/** Atrapa terminala: odpowiedzi z listy (albo wyjątek), zapisuje pytania i wyjście. */
function fakeTerminal(answers: ReadonlyArray<string | Error> = ANSWERS) {
  const queue = [...answers];
  const lines: string[] = [];
  const questions: Array<{ question: string; hidden: boolean }> = [];
  const next = async (question: string, hidden: boolean) => {
    questions.push({ question, hidden });
    const answer = queue.shift();
    if (answer instanceof Error) throw answer;
    if (answer === undefined) throw new InputClosedError("eof");
    return answer;
  };
  const terminal = {
    write: vi.fn((line: string) => lines.push(line)),
    ask: vi.fn((question: string) => next(question, false)),
    askHidden: vi.fn((question: string) => next(question, true)),
    close: vi.fn(),
  } satisfies OperatorTerminal;
  return { terminal, lines, questions };
}

function fakeBackend(createOperator: (input: OperatorInput) => Promise<AccountDto> = async () => ACCOUNT) {
  return { createOperator: vi.fn(createOperator), close: vi.fn(async () => undefined) } satisfies OperatorBackend;
}

describe("runCreateOperator", () => {
  it("pyta o e-mail, nazwę i dwa razy o hasło (hasło bez echa), zakłada konto i kończy kodem 0", async () => {
    const { terminal, lines, questions } = fakeTerminal();
    const backend = fakeBackend();

    const code = await runCreateOperator([], terminal, backend);

    expect(code).toBe(0);
    expect(questions).toEqual([
      { question: "E-mail: ", hidden: false },
      { question: "Wyświetlana nazwa: ", hidden: false },
      { question: "Hasło (min. 12 znaków, wpisywane bez echa): ", hidden: true },
      { question: "Powtórz hasło: ", hidden: true },
    ]);
    // Surowe odpowiedzi — normalizację i walidację robi serwis.
    expect(backend.createOperator).toHaveBeenCalledExactlyOnceWith({
      email: "  Admin@Example.com ",
      displayName: "Operatorka",
      password: PASSWORD,
    });
    expect(lines).toEqual([MESSAGES.intro, "Utworzono konto operatora admin@example.com. Zaloguj się na /login."]);
    expect(lines.join("\n")).not.toContain(PASSWORD);
    expect(terminal.close).toHaveBeenCalledOnce();
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it("różne hasła → komunikat, kod 1, bez zakładania konta", async () => {
    const { terminal, lines } = fakeTerminal(["a@example.com", "A", PASSWORD, `${PASSWORD}x`]);
    const backend = fakeBackend();

    const code = await runCreateOperator([], terminal, backend);

    expect(code).toBe(1);
    expect(backend.createOperator).not.toHaveBeenCalled();
    expect(lines.at(-1)).toBe(MESSAGES.passwordMismatch);
    expect(lines.join("\n")).not.toContain(PASSWORD);
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it.each([
    ["Ctrl+C", new InputClosedError("cancelled"), MESSAGES.cancelled],
    ["koniec wejścia", new InputClosedError("eof"), MESSAGES.inputEnded],
  ])("%s w trakcie pytań → komunikat i kod 1, bez zakładania konta", async (_case, error, message) => {
    const { terminal, lines } = fakeTerminal(["a@example.com", error]);
    const backend = fakeBackend();

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.at(-1)).toBe(message);
    expect(backend.createOperator).not.toHaveBeenCalled();
    expect(terminal.close).toHaveBeenCalledOnce();
  });

  it("inny błąd terminala leci dalej, a terminal i pula i tak są zamykane", async () => {
    const failure = new Error("EIO");
    const { terminal } = fakeTerminal([failure]);
    const backend = fakeBackend();

    await expect(runCreateOperator([], terminal, backend)).rejects.toBe(failure);
    expect(terminal.close).toHaveBeenCalledOnce();
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it("błędy walidacji → komunikaty pól w kolejności pytań, kod 1, bez hasła na wyjściu", async () => {
    const { terminal, lines } = fakeTerminal(["zly", "", "krotkie", "krotkie"]);
    const backend = fakeBackend(async () => {
      throw new ValidationError("Nieprawidłowe dane", {
        password: ["Hasło musi mieć co najmniej 12 znaków"],
        email: ["Podaj poprawny adres e-mail, np. ola@example.com"],
        nieznane: ["Inny problem"],
        displayName: ["Podaj wyświetlaną nazwę"],
      });
    });

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.slice(1)).toEqual([
      MESSAGES.invalid,
      "  E-mail: Podaj poprawny adres e-mail, np. ola@example.com",
      "  Wyświetlana nazwa: Podaj wyświetlaną nazwę",
      "  Hasło: Hasło musi mieć co najmniej 12 znaków",
      "  Inny problem",
    ]);
    expect(lines.join("\n")).not.toContain("krotkie");
  });

  it("błąd walidacji bez pól → jego komunikat", async () => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend(async () => {
      throw new ValidationError("Nieprawidłowe dane");
    });

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.slice(1)).toEqual([MESSAGES.invalid, "  Nieprawidłowe dane"]);
  });

  it("zajęty e-mail → komunikat przy polu e-mail i kod 1", async () => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend(async () => {
      throw new ConflictError("Ten e-mail ma już konto", { email: ["Ten e-mail ma już konto"] });
    });

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.slice(1)).toEqual([MESSAGES.invalid, "  E-mail: Ten e-mail ma już konto"]);
    expect(lines.join("\n")).not.toContain(PASSWORD);
  });

  it.each([
    ["ServiceUnavailableError (start kontenera)", new ServiceUnavailableError("Baza danych jest niedostępna")],
    ["surowy błąd sieci sterownika (flush)", Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" })],
  ])("baza niedostępna — %s → czytelny komunikat i kod 1", async (_case, error) => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend(async () => {
      throw error;
    });

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.at(-1)).toBe(MESSAGES.databaseUnavailable);
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it.each([
    [new Error("Nieprawidłowa konfiguracja środowiska — DATABASE_URL"), "Nieprawidłowa konfiguracja środowiska — DATABASE_URL"],
    ["napis", "napis"],
  ])("nieoczekiwany błąd → jego komunikat i kod 1", async (error, message) => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend(async () => {
      throw error;
    });

    expect(await runCreateOperator([], terminal, backend)).toBe(1);
    expect(lines.at(-1)).toBe(`${MESSAGES.unexpected} ${message}`);
    expect(lines.join("\n")).not.toContain(PASSWORD);
  });

  it("błąd zamykania puli nie zmienia kodu wyjścia — tylko ostrzeżenie", async () => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend();
    backend.close.mockRejectedValue(new Error("pool closed"));

    expect(await runCreateOperator([], terminal, backend)).toBe(0);
    expect(lines.at(-1)).toBe(`${MESSAGES.closeFailed} pool closed`);
  });

  it("--reset-password → komunikat o etapie B, kod 1, bez pytań i bez zakładania konta", async () => {
    const { terminal, lines } = fakeTerminal();
    const backend = fakeBackend();

    expect(await runCreateOperator(["--reset-password"], terminal, backend)).toBe(1);
    expect(lines).toEqual([...MESSAGES.resetUnavailable]);
    expect(terminal.ask).not.toHaveBeenCalled();
    expect(backend.createOperator).not.toHaveBeenCalled();
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it.each([[["--email", "a@example.com"]], [["haslo"]], [["--password=tajne-haslo-12"]]])(
    "argumenty %j → komunikat użycia i kod 1, bez pytań (hasło nigdy nie jest argumentem)",
    async (args) => {
      const { terminal, lines } = fakeTerminal();
      const backend = fakeBackend();

      expect(await runCreateOperator(args, terminal, backend)).toBe(1);
      expect(lines).toEqual([...MESSAGES.usage]);
      expect(lines.join("\n")).not.toContain("tajne-haslo-12");
      expect(terminal.ask).not.toHaveBeenCalled();
      expect(backend.createOperator).not.toHaveBeenCalled();
    },
  );
});
