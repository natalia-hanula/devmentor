import { afterEach, describe, expect, it, vi } from "vitest";

const core = vi.hoisted(() => ({ withScope: vi.fn(), closeContainer: vi.fn() }));
const runCreateOperator = vi.hoisted(() => vi.fn());
const terminal = vi.hoisted(() => ({ fake: "terminal" }));
const createTerminal = vi.hoisted(() => vi.fn(() => terminal));

vi.mock("@devmentor/core", () => core);
vi.mock("../../operator/run-create-operator.ts", () => ({ runCreateOperator }));
vi.mock("../../operator/terminal.ts", () => ({ createTerminal }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("scripts/create-operator.ts", () => {
  it("uruchamia CLI z argumentami procesu na stdin/stdout, zakłada konto przez withScope i ustawia kod wyjścia", async () => {
    runCreateOperator.mockResolvedValue(1);

    await import("../../create-operator.ts");

    expect(createTerminal).toHaveBeenCalledWith(process.stdin, process.stdout);
    const [args, usedTerminal, backend] = runCreateOperator.mock.calls[0] as [
      string[],
      unknown,
      { createOperator: (input: unknown) => Promise<unknown>; close: unknown },
    ];
    expect(args).toEqual(process.argv.slice(2));
    expect(usedTerminal).toBe(terminal);
    expect(backend.close).toBe(core.closeContainer);
    expect(process.exitCode).toBe(1);

    const account = { email: "admin@example.com" };
    const accountService = { createOperator: vi.fn(async () => account) };
    core.withScope.mockImplementation(async (work: (cradle: unknown) => Promise<unknown>) => work({ accountService }));
    const input = { email: "admin@example.com", displayName: "A", password: "tajne-haslo-12" };

    await expect(backend.createOperator(input)).resolves.toBe(account);
    expect(accountService.createOperator).toHaveBeenCalledWith(input);
  });
});
