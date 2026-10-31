import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const runCheckAgents = vi.hoisted(() => vi.fn());
const createSystem = vi.hoisted(() => vi.fn(() => ({ fake: true })));

vi.mock("../check-agents/run-check-agents.ts", () => ({ runCheckAgents }));
vi.mock("../check-agents/system.ts", () => ({ createSystem }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("scripts/check-agents.ts", () => {
  it("uruchamia sprawdzenie w katalogu głównym repo, pisze na stdout i ustawia kod wyjścia", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    runCheckAgents.mockImplementation((_system: unknown, log: (line: string) => void) => {
      log("wynik");
      return 1;
    });

    await import("../check-agents.ts");

    expect(createSystem).toHaveBeenCalledWith(resolve(import.meta.dirname, "..", ".."));
    expect(runCheckAgents).toHaveBeenCalledWith({ fake: true }, expect.any(Function));
    expect(stdout).toHaveBeenCalledWith("wynik\n");
    expect(process.exitCode).toBe(1);
    stdout.mockRestore();
  });
});
