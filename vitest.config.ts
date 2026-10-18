import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testy jednostkowe: każdy pakiet z testami ma własny `vitest.config.ts` (defineProject).
    // Testy integracyjne mają osobną konfigurację: `tests/integration/vitest.config.ts`.
    projects: ["packages/*/vitest.config.{ts,mts}"],
    coverage: {
      provider: "v8",
      // Zakres reguły 100% (AGENTS.md → „Testy”). Wyłączenia są zamknięte — nie dopisuj nowych bez zgody człowieka.
      include: ["packages/*/src/**/*.{ts,tsx}", "packages/app/app/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/*.config.{ts,mts}", "packages/db/migrations/**"],
      thresholds: { 100: true, perFile: true },
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
