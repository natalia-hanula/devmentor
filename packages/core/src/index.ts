export { parseEnv, type Env } from "./config/env";
export { createLogger, getLogger, LOG_REDACT_PATHS, type Logger } from "./logger";
export { closeContainer, createAppContainer, getContainer, withScope } from "./container/container";
export type { AppCradle, RequestCradle } from "./container/cradle";
export * from "./http/errors";
export { isDatabaseUnavailableError } from "@devmentor/db";
export {
  apiHandler,
  withCookies,
  parseInput,
  parseJsonBody,
  REQUEST_MARKER_HEADER,
  type ApiHandlerOptions,
  type ApiResult,
  type RouteContext,
  type RouteHandler,
} from "./http/api-handler";
export { redirectHandler } from "./http/redirect-handler";
export { safeNextPath } from "./http/safe-next-path";
export { clientIp, UNKNOWN_CLIENT_IP, type ClientIpOptions } from "./http/client-ip";
export { makeCrudRoute, parseIdQuery, parseUuidParam, type AccessRule, type CrudService } from "./http/make-crud-route";
export {
  assertOwnership,
  getSession,
  requireRole,
  requireRoleAccess,
  requireSession,
  type Role,
  type Session,
} from "./http/auth";
export { getSessionFromCookieValue } from "./http/session";
export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./http/session-constants";
export {
  AccountService,
  EMAIL_TAKEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  type AccountDto,
  type AccountServiceDependencies,
  type AuthenticatedAccount,
  type EmailVerificationResult,
  type OperatorInput,
} from "./services/auth/account.service";
export {
  INVITATION_MAIL_SUBJECT,
  INVITE_PATH,
  invitationLink,
  invitationMail,
  VERIFICATION_MAIL_SUBJECT,
  VERIFY_EMAIL_PATH,
  verificationLink,
  verificationMail,
} from "./services/auth/auth-mail";
export {
  AUTH_RATE_LIMITS,
  consumeLoginAttempt,
  consumeRegisterAttempt,
  consumeTokenConfirmAttempt,
  consumeVerifyResendAttempt,
} from "./services/auth/auth-rate-limits";
export {
  INVALID_INVITATION_MESSAGE,
  INVITATION_ALREADY_ACCEPTED_MESSAGE,
  INVITATION_RACE_MESSAGE,
  InvitationService,
  invitationStatus,
  MENTOR_INVITATION_TTL_DAYS,
  MENTOR_ROLE_NOT_FOUND_MESSAGE,
  MENTOR_INVITATION_TTL_MS,
  type AcceptedInvitationResult,
  type CreatedInvitationDto,
  type InvitationAcceptedByDto,
  type InvitationDto,
  type InvitationServiceDependencies,
  type InvitationStatus,
} from "./services/auth/invitation.service";
export { BCRYPT_COST, DUMMY_PASSWORD_HASH, PasswordHasher } from "./services/auth/password-hasher.service";
export { SessionTokenService } from "./services/auth/session-token.service";
export {
  EMAIL_VERIFICATION_TTL_MS,
  generateRawToken,
  hashToken,
  UserTokenService,
  type UserTokenPurpose,
} from "./services/auth/user-token.service";
export {
  isSeedAllowed,
  SEED_FORBIDDEN_MESSAGE,
  SeedService,
  type SeedServiceDependencies,
  type TestAccountInput,
} from "./services/dev/seed.service";
export { DatabaseHealthService, type DatabaseHealth } from "./services/health/database-health.service";
export { TechnologyService, type TechnologyDto } from "./services/mentors/technology.service";
export type { MailGateway, MailMessage } from "./services/mail/mail.port";
export { NoopMailAdapter } from "./services/mail/adapters/noop-mail.adapter";
export { OUTBOX_CAPACITY, OutboxMailAdapter, type OutboxMessage } from "./services/mail/adapters/outbox-mail.adapter";
export { isMailDeliveryAvailable, isMailOutboxEnabled } from "./services/mail/mail-gateway";
export { listOutboxMessages, type OutboxMessageDto } from "./services/mail/outbox-preview";
export { RATE_LIMIT_MAX_KEYS, RateLimiter, type RateLimitRule } from "./services/rate-limit/rate-limiter.service";
