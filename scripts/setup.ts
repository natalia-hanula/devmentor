// Instalator: `npm run setup` (spec: .ai/specs/implemented/2026-10-18-instalator-setup.md).
import { resolve } from "node:path";
import { runSetup } from "./setup/run-setup.ts";
import { SETUP_STEPS } from "./setup/steps/index.ts";
import { createSystem } from "./setup/system.ts";

process.exitCode = await runSetup(createSystem(resolve(import.meta.dirname, "..")), SETUP_STEPS);
