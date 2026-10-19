import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Stories jako testy (render, play functions, a11y) w Chromium — osobno w każdym motywie.
// Plik nie pasuje do globu projektów `npm test` (packages/*/vitest.config.*), więc nie zmienia testów jednostkowych.
const dirname = path.dirname(fileURLToPath(import.meta.url));

const themeProject = (theme: "light" | "dark") => ({
  extends: true,
  plugins: [storybookTest({ configDir: path.join(dirname, ".storybook"), initialGlobals: { theme } })],
  test: {
    name: `storybook-${theme}`,
    browser: { enabled: true, headless: true, provider: playwright({}), instances: [{ browser: "chromium" as const }] },
  },
});

export default defineConfig({
  test: { projects: [themeProject("light"), themeProject("dark")] },
});
