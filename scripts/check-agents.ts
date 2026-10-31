// Sprawdza, czy ścieżki wymienione w AGENTS.md istnieją: `npm run check:agents`.
import { resolve } from "node:path";
import { runCheckAgents } from "./check-agents/run-check-agents.ts";
import { createSystem } from "./check-agents/system.ts";

process.exitCode = runCheckAgents(createSystem(resolve(import.meta.dirname, "..")), (line) =>
  process.stdout.write(`${line}\n`),
);
