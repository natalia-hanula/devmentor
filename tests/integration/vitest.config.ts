import { defineConfig } from "vitest/config";

const ONE_MINUTE_MS = 60_000;

export default defineConfig({
  test: {
    name: "integration",
    root: import.meta.dirname,
    include: ["**/*.int.test.ts"],
    globalSetup: ["global-setup.ts"],
    // Jedna baza i jedna instancja aplikacji na cały przebieg — pliki testów kolejno.
    fileParallelism: false,
    testTimeout: ONE_MINUTE_MS,
    // Pierwsze uruchomienie kontenera PostgreSQL (pobranie obrazu) potrafi trwać dłużej.
    hookTimeout: 3 * ONE_MINUTE_MS,
  },
});
