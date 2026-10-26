import type { SetupContext, SetupStep, SetupSystem, StepStatus } from "./types.ts";

const STATUS_LABEL: Record<StepStatus, string> = {
  done: "✓ wykonano",
  skipped: "– pominięto",
  failed: "✗ błąd",
};

/** Wykonuje kroki po kolei i zatrzymuje się na pierwszym błędzie. Zwraca kod wyjścia procesu. */
export async function runSetup(system: SetupSystem, steps: readonly SetupStep[]): Promise<number> {
  const context: SetupContext = { system };
  try {
    for (const step of steps) {
      const result = await runStep(step, context);
      system.write(`${STATUS_LABEL[result.status]} — ${step.name}: ${result.message}`);
      if (result.status === "failed") {
        system.write("");
        system.write("Instalacja przerwana. Popraw powyższy błąd i uruchom ponownie `npm run setup` — wykonane kroki zostaną pominięte.");
        return 1;
      }
    }
    system.write("");
    system.write("Gotowe. Uruchom aplikację: npm run dev");
    // Instalator jest nieinteraktywny — konta operatora nie zakłada, tylko podpowiada (spec E01 → „CLI”).
    system.write("Konto operatora: npm run operator:create");
    return 0;
  } finally {
    await closeClient(context);
  }
}

/** Błąd przy zamykaniu połączenia nie może zmienić wyniku instalacji — tylko go zgłaszamy. */
async function closeClient({ client, system }: SetupContext) {
  try {
    await client?.end();
  } catch (error) {
    system.write(`uwaga: nie udało się zamknąć połączenia z PostgreSQL: ${errorMessage(error)}`);
  }
}

async function runStep(step: SetupStep, context: SetupContext) {
  try {
    return await step.run(context);
  } catch (error) {
    return { status: "failed" as const, message: errorMessage(error) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
