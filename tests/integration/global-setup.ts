import type { TestProject } from "vitest/node";
import { startAppServer } from "./support/app-server";
import { migrate, startDatabase } from "./support/database";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    databaseUrl: string;
    appLogPath: string;
  }
}

/** PostgreSQL → migracje → `next start`; adresy trafiają do testów przez `inject()`. */
export default async function setup(project: TestProject) {
  const database = await startDatabase();
  try {
    await migrate(database.url);
    const app = await startAppServer(database.url);
    project.provide("baseUrl", app.url);
    project.provide("databaseUrl", database.url);
    project.provide("appLogPath", app.logPath);

    return async () => {
      await app.stop();
      await database.stop();
    };
  } catch (error) {
    await database.stop();
    throw error;
  }
}
