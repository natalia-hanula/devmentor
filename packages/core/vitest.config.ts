import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineProject } from "vitest/config";

const rootEnv = resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export default defineProject({
  test: {
    name: "core",
    include: ["test/**/*.test.ts"],
    // Testy integracyjne korzystają z jednej bazy testowej — bez równoległych plików.
    fileParallelism: false,
    env: { LOG_LEVEL: "silent" },
  },
});
