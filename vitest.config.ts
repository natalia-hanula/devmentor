import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Każdy pakiet z testami ma własny `vitest.config.ts` (defineProject).
    projects: ["packages/*/vitest.config.ts"],
  },
});
