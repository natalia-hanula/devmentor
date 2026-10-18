import type { SetupStep } from "../types.ts";

// `npm install` jest uruchamiany zawsze: npm sam jest idempotentny, a `npm ls` nie wykrywa
// zmian w `package-lock.json` (spec, A3).
export const dependenciesStep: SetupStep = {
  name: "Zależności (npm install)",
  async run({ system }) {
    const exitCode = await system.run("npm", ["install"]);
    if (exitCode !== 0) {
      return { status: "failed", message: `npm install zakończył się kodem ${exitCode}.` };
    }
    return { status: "done", message: "zależności zgodne z package-lock.json" };
  },
};
