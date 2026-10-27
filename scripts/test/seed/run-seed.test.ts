import { ConflictError, ForbiddenError, ServiceUnavailableError, ValidationError, type AccountDto, type Env } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";
import { MESSAGES, runSeed, type SeedBackend } from "../../seed/run-seed.ts";
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../../seed/test-accounts.ts";

const HASH = "$2b$12$abcdefghijklmnopqrstuuMBnXfJ6sFhP9pW8bq3C6m3Y4l2oQx1e";

function account(email: string, roles: AccountDto["roles"]): AccountDto {
  return { id: `id-${email}`, email, displayName: "x", roles, emailVerified: true, hasPassword: true };
}

function setup(appEnv: Env["APP_ENV"] = "local") {
  const lines: string[] = [];
  const order: string[] = [];
  const backend = {
    appEnv: vi.fn(() => appEnv),
    createOperator: vi.fn(async (input: { email: string }) => {
      order.push("operator");
      return account(input.email, ["operator"]);
    }),
    createMentee: vi.fn(async (input: { email: string }, emailVerified: boolean) => {
      order.push(emailVerified ? "mentee" : "mentee-unverified");
      return account(input.email, ["mentee"]);
    }),
    createMentor: vi.fn(async (input: { email: string }) => {
      order.push("mentor");
      return account(input.email, ["mentee", "mentor"]);
    }),
    close: vi.fn(async () => {
      order.push("close");
    }),
  } satisfies SeedBackend;
  return { lines, order, backend, write: (line: string) => lines.push(line) };
}

const conflict = () => new ConflictError("Ten e-mail ma już konto", { email: ["Ten e-mail ma już konto"] });

describe("runSeed", () => {
  it("zakłada operatora, mentee, mentora i mentee z niepotwierdzonym adresem (w tej kolejności) hasłem testowym, wypisuje konta i hasło, kod 0", async () => {
    const { lines, order, backend, write } = setup();

    const code = await runSeed(write, backend);

    expect(code).toBe(0);
    expect(order).toEqual(["operator", "mentee", "mentor", "mentee-unverified", "close"]);
    const { operator, mentee, mentor, menteeUnverified } = TEST_ACCOUNTS;
    expect(backend.createOperator).toHaveBeenCalledWith({
      email: operator.email,
      displayName: operator.displayName,
      password: TEST_PASSWORD,
    });
    expect(backend.createMentee).toHaveBeenNthCalledWith(
      1,
      { email: mentee.email, displayName: mentee.displayName, password: TEST_PASSWORD },
      true,
    );
    expect(backend.createMentee).toHaveBeenNthCalledWith(
      2,
      { email: menteeUnverified.email, displayName: menteeUnverified.displayName, password: TEST_PASSWORD },
      false,
    );
    expect(backend.createMentor).toHaveBeenCalledWith(
      { email: mentor.email, displayName: mentor.displayName, password: TEST_PASSWORD },
      operator.email,
    );
    expect(lines).toEqual([
      "Konta testowe DevMentor:",
      "  operator.test@example.com (operator) — utworzone",
      "  mentee.test@example.com (mentee) — utworzone",
      "  mentor.test@example.com (mentee, mentor) — utworzone",
      "  mentee.niepotwierdzone@example.com (mentee, adres niepotwierdzony) — utworzone",
      "Hasło wszystkich kont testowych: test-haslo-nie-sekret (dane testowe, nie sekret)",
    ]);
  });

  it("hasło testowe pojawia się tylko w jednym zdaniu, bez hashy", async () => {
    const { lines, backend, write } = setup();

    await runSeed(write, backend);

    expect(lines.filter((line) => line.includes(TEST_PASSWORD))).toEqual([MESSAGES.password]);
    expect(lines.join("\n")).not.toMatch(/\$2[aby]\$/);
    expect(lines.join("\n")).not.toContain(HASH);
  });

  it("drugie uruchomienie: każde konto już istnieje → „już istnieje, pomijam”, kod 0", async () => {
    const { lines, backend, write } = setup();
    backend.createOperator.mockRejectedValue(conflict());
    backend.createMentee.mockRejectedValue(conflict());
    backend.createMentor.mockRejectedValue(conflict());

    const code = await runSeed(write, backend);

    expect(code).toBe(0);
    expect(lines).toEqual([
      "Konta testowe DevMentor:",
      "  operator.test@example.com (operator) — już istnieje, pomijam",
      "  mentee.test@example.com (mentee) — już istnieje, pomijam",
      "  mentor.test@example.com (mentee, mentor) — już istnieje, pomijam",
      "  mentee.niepotwierdzone@example.com (mentee, adres niepotwierdzony) — już istnieje, pomijam",
      MESSAGES.password,
    ]);
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it("istniejący operator nie blokuje założenia mentora (granted_by szukane po e-mailu w core)", async () => {
    const { lines, backend, write } = setup();
    backend.createOperator.mockRejectedValue(conflict());

    expect(await runSeed(write, backend)).toBe(0);
    expect(backend.createMentor).toHaveBeenCalledWith(expect.anything(), TEST_ACCOUNTS.operator.email);
    expect(lines).toContain("  mentor.test@example.com (mentee, mentor) — utworzone");
  });

  it.each(["staging", "production"] as const)("APP_ENV=%s → odmowa przed jakimkolwiek zapisem, kod 1, pula zamknięta", async (appEnv) => {
    const { lines, backend, write } = setup(appEnv);

    const code = await runSeed(write, backend);

    expect(code).toBe(1);
    expect(lines).toEqual([MESSAGES.forbidden]);
    expect(backend.createOperator).not.toHaveBeenCalled();
    expect(backend.createMentee).not.toHaveBeenCalled();
    expect(backend.createMentor).not.toHaveBeenCalled();
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it("blokada z core (ForbiddenError) → ten sam komunikat o produkcji, kod 1, bez hasła", async () => {
    const { lines, backend, write } = setup();
    backend.createOperator.mockRejectedValue(new ForbiddenError("zablokowane"));

    expect(await runSeed(write, backend)).toBe(1);
    expect(lines).toEqual([MESSAGES.intro, MESSAGES.forbidden]);
    expect(backend.createMentee).not.toHaveBeenCalled();
  });

  it.each([
    ["ServiceUnavailableError z kontenera", new ServiceUnavailableError("Baza danych jest niedostępna")],
    ["surowy błąd sterownika (ECONNREFUSED)", Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" })],
  ])("baza niedostępna (%s) → komunikat jak w CLI operatora, kod 1", async (_name, failure) => {
    const { lines, backend, write } = setup();
    backend.createOperator.mockRejectedValue(failure);

    expect(await runSeed(write, backend)).toBe(1);
    expect(lines).toEqual([MESSAGES.intro, MESSAGES.databaseUnavailable]);
    expect(lines.join("\n")).not.toContain(TEST_PASSWORD);
    expect(backend.close).toHaveBeenCalledOnce();
  });

  it("inny błąd (np. walidacja) przerywa seed: kolejne konta nie powstają, kod 1", async () => {
    const { lines, backend, write } = setup();
    backend.createMentee.mockRejectedValue(new ValidationError("Nieprawidłowe dane"));

    expect(await runSeed(write, backend)).toBe(1);
    expect(backend.createMentor).not.toHaveBeenCalled();
    expect(lines).toEqual([
      MESSAGES.intro,
      "  operator.test@example.com (operator) — utworzone",
      `${MESSAGES.unexpected} Nieprawidłowe dane`,
    ]);
  });

  it("błąd konfiguracji (parseEnv) → komunikat, kod 1; wartość spoza Error też zgłoszona", async () => {
    const { lines, backend, write } = setup();
    backend.appEnv.mockImplementation(() => {
      throw new Error("Nieprawidłowa konfiguracja środowiska — DATABASE_URL: wymagany");
    });

    expect(await runSeed(write, backend)).toBe(1);
    expect(lines).toEqual([`${MESSAGES.unexpected} Nieprawidłowa konfiguracja środowiska — DATABASE_URL: wymagany`]);

    const second = setup();
    second.backend.createOperator.mockRejectedValue("tekst");
    expect(await runSeed(second.write, second.backend)).toBe(1);
    expect(second.lines.at(-1)).toBe(`${MESSAGES.unexpected} tekst`);
  });

  it("błąd zamykania puli jest zgłaszany, ale nie zmienia wyniku", async () => {
    const { lines, backend, write } = setup();
    backend.close.mockRejectedValueOnce(new Error("pool busy")).mockRejectedValueOnce("x");

    expect(await runSeed(write, backend)).toBe(0);
    expect(lines.at(-1)).toBe(`${MESSAGES.closeFailed} pool busy`);

    const second = setup("production");
    second.backend.close.mockRejectedValue("x");
    expect(await runSeed(second.write, second.backend)).toBe(1);
    expect(second.lines.at(-1)).toBe(`${MESSAGES.closeFailed} x`);
  });
});
