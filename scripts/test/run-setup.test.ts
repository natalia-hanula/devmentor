import { describe, expect, it, vi } from "vitest";
import { runSetup } from "../setup/run-setup.ts";
import type { SetupStep } from "../setup/types.ts";
import { fakeClient, fakeSystem } from "./fake-system.ts";

const step = (name: string, run: SetupStep["run"]): SetupStep => ({ name, run: vi.fn(run) });

describe("runSetup", () => {
  it("wykonuje kroki po kolei, raportuje każdy i kończy się kodem 0", async () => {
    const system = fakeSystem();
    const steps = [
      step("A", async () => ({ status: "done", message: "zrobione" })),
      step("B", async () => ({ status: "skipped", message: "już było" })),
    ];

    await expect(runSetup(system, steps)).resolves.toBe(0);

    expect(system.lines).toEqual([
      "✓ wykonano — A: zrobione",
      "– pominięto — B: już było",
      "",
      "Gotowe. Uruchom aplikację: npm run dev",
    ]);
  });

  it("zatrzymuje się na pierwszym błędzie i nie wykonuje kolejnych kroków", async () => {
    const system = fakeSystem();
    const later = step("C", async () => ({ status: "done", message: "" }));

    const code = await runSetup(system, [step("A", async () => ({ status: "failed", message: "zepsute" })), later]);

    expect(code).toBe(1);
    expect(later.run).not.toHaveBeenCalled();
    expect(system.lines[0]).toBe("✗ błąd — A: zepsute");
    expect(system.lines.at(-1)).toContain("uruchom ponownie `npm run setup`");
  });

  it("zamienia wyjątek kroku na błąd z jego komunikatem", async () => {
    const system = fakeSystem();

    await runSetup(system, [
      step("A", async () => {
        throw new Error("nie ma pliku");
      }),
    ]);
    await runSetup(system, [
      step("B", async () => {
        throw "napis";
      }),
    ]);

    expect(system.lines).toContain("✗ błąd — A: nie ma pliku");
    expect(system.lines).toContain("✗ błąd — B: napis");
  });

  it("zamyka połączenie z bazą otwarte przez krok, także po błędzie", async () => {
    const system = fakeSystem();
    const client = fakeClient();

    await runSetup(system, [
      step("A", async (context) => {
        context.client = client;
        return { status: "failed", message: "x" };
      }),
    ]);

    expect(client.end).toHaveBeenCalledOnce();
  });
});
