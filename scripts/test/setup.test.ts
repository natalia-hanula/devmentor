import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const runSetup = vi.hoisted(() => vi.fn());
const createSystem = vi.hoisted(() => vi.fn(() => ({ fake: true })));

vi.mock("../setup/run-setup.ts", () => ({ runSetup }));
vi.mock("../setup/system.ts", () => ({ createSystem }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("scripts/setup.ts", () => {
  it("uruchamia instalator w katalogu głównym repo i ustawia kod wyjścia", async () => {
    runSetup.mockResolvedValue(1);
    const { SETUP_STEPS } = await import("../setup/steps/index.ts");

    await import("../setup.ts");

    expect(createSystem).toHaveBeenCalledWith(resolve(import.meta.dirname, "..", ".."));
    expect(runSetup).toHaveBeenCalledWith({ fake: true }, SETUP_STEPS);
    expect(process.exitCode).toBe(1);
  });
});
