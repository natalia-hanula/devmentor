import type { EntityManager, MikroORM } from "@devmentor/db";
import type { Env } from "../config/env";
import type { Logger } from "../logger";
import type { AccountService } from "../services/auth/account.service";
import type { InvitationService } from "../services/auth/invitation.service";
import type { PasswordHasher } from "../services/auth/password-hasher.service";
import type { SessionTokenService } from "../services/auth/session-token.service";
import type { UserTokenService } from "../services/auth/user-token.service";
import type { OutboxMailAdapter } from "../services/mail/adapters/outbox-mail.adapter";
import type { MailGateway } from "../services/mail/mail.port";
import type { SeedService } from "../services/dev/seed.service";
import type { DatabaseHealthService } from "../services/health/database-health.service";
import type { TechnologyService } from "../services/mentors/technology.service";
import type { RateLimiter } from "../services/rate-limit/rate-limiter.service";

/** Zależności kontenera głównego — jedna instancja na proces. */
export interface AppCradle {
  env: Env;
  logger: Logger;
  orm: MikroORM;
  sessionTokenService: SessionTokenService;
  passwordHasher: PasswordHasher;
  rateLimiter: RateLimiter;
  mailGateway: MailGateway;
  /**
   * Ta sama instancja co `mailGateway`, gdy `MAIL_ADAPTER=outbox` (podgląd skrzynki); inaczej `null`.
   * Osobne pole zamiast `instanceof`: każda warstwa Next ma własną kopię modułu klasy, a kontener jest jeden na proces.
   */
  mailOutbox: OutboxMailAdapter | null;
}

/** Zależności scope żądania. Każdy nowy serwis: wpis tutaj + rejestracja w `container.ts`. */
export interface RequestCradle extends AppCradle {
  em: EntityManager;
  databaseHealthService: DatabaseHealthService;
  technologyService: TechnologyService;
  userTokenService: UserTokenService;
  accountService: AccountService;
  invitationService: InvitationService;
  seedService: SeedService;
}
