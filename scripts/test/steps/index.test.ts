import { describe, expect, it } from "vitest";
import { SETUP_STEPS } from "../../setup/steps/index.ts";

describe("SETUP_STEPS", () => {
  it("odtwarza kolejność z README → „Uruchomienie lokalne”", () => {
    expect(SETUP_STEPS.map((step) => step.name)).toEqual([
      "Platforma",
      "Node.js",
      "Zależności (npm install)",
      "Plik .env",
      "Symlink packages/app/.env",
      "DATABASE_URL",
      "PostgreSQL",
      "Bazy danych",
      "Migracje",
    ]);
  });
});
