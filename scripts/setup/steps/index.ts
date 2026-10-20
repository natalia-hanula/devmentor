import type { SetupStep } from "../types.ts";
import { connectStep, databasesStep, databaseUrlStep, migrationsStep } from "./database.ts";
import { dependenciesStep } from "./dependencies.ts";
import { appEnvLinkStep, envFileStep, sessionEnvStep } from "./env-file.ts";
import { nodeVersionStep, platformStep } from "./requirements.ts";

/** Kolejność z README → „Uruchomienie lokalne”; każdy krok sam sprawdza, czy jest już zrobiony. */
export const SETUP_STEPS: readonly SetupStep[] = [
  platformStep,
  nodeVersionStep,
  dependenciesStep,
  envFileStep,
  sessionEnvStep,
  appEnvLinkStep,
  databaseUrlStep,
  connectStep,
  databasesStep,
  migrationsStep,
];
