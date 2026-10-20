import type { EntityManager, MikroORM } from "@devmentor/db";
import type { Env } from "../config/env";
import type { Logger } from "../logger";
import type { SessionTokenService } from "../services/auth/session-token.service";
import type { DatabaseHealthService } from "../services/health/database-health.service";
import type { TechnologyService } from "../services/mentors/technology.service";

/** Zależności kontenera głównego — jedna instancja na proces. */
export interface AppCradle {
  env: Env;
  logger: Logger;
  orm: MikroORM;
  sessionTokenService: SessionTokenService;
}

/** Zależności scope żądania. Każdy nowy serwis: wpis tutaj + rejestracja w `container.ts`. */
export interface RequestCradle extends AppCradle {
  em: EntityManager;
  databaseHealthService: DatabaseHealthService;
  technologyService: TechnologyService;
}
