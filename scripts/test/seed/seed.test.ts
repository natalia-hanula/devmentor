import { afterEach, describe, expect, it, vi } from "vitest";

const core = vi.hoisted(() => ({ withScope: vi.fn(), closeContainer: vi.fn(), parseEnv: vi.fn() }));
const runSeed = vi.hoisted(() => vi.fn());

vi.mock("@devmentor/core", () => core);
vi.mock("../../seed/run-seed.ts", () => ({ runSeed }));

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("scripts/seed.ts", () => {
  it("uruchamia seed na stdout, zakłada konta przez withScope → seedService, APP_ENV z parseEnv, ustawia kod wyjścia", async () => {
    runSeed.mockResolvedValue(1);

    await import("../../seed.ts");

    const [write, backend] = runSeed.mock.calls[0] as [
      (line: string) => void,
      {
        appEnv: () => string;
        createOperator: (input: unknown) => Promise<unknown>;
        createMentee: (input: unknown) => Promise<unknown>;
        createMentor: (input: unknown, grantedByEmail: string) => Promise<unknown>;
        close: unknown;
      },
    ];
    expect(process.exitCode).toBe(1);
    expect(backend.close).toBe(core.closeContainer);

    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    write("linia");
    expect(stdout).toHaveBeenCalledWith("linia\n");

    core.parseEnv.mockReturnValue({ APP_ENV: "local" });
    expect(backend.appEnv()).toBe("local");

    const seedService = {
      createOperator: vi.fn(async () => "operator"),
      createMentee: vi.fn(async () => "mentee"),
      createMentor: vi.fn(async () => "mentor"),
    };
    core.withScope.mockImplementation(async (work: (cradle: unknown) => Promise<unknown>) => work({ seedService }));
    const input = { email: "a@example.com", displayName: "A", password: "test-haslo-nie-sekret" };

    await expect(backend.createOperator(input)).resolves.toBe("operator");
    await expect(backend.createMentee(input)).resolves.toBe("mentee");
    await expect(backend.createMentor(input, "op@example.com")).resolves.toBe("mentor");
    expect(seedService.createOperator).toHaveBeenCalledWith(input);
    expect(seedService.createMentee).toHaveBeenCalledWith(input);
    expect(seedService.createMentor).toHaveBeenCalledWith(input, "op@example.com");
    expect(core.withScope).toHaveBeenCalledTimes(3);
  });
});
