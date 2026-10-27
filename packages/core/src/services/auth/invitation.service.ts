import {
  MENTOR_INVITATION_ACTIVE_EMAIL_CONSTRAINT,
  MentorInvitation,
  UniqueConstraintViolationException,
  User,
  USER_ROLES,
  UserRole,
  type EntityManager,
} from "@devmentor/db";
import type { Env } from "../../config/env";
import type { Role } from "../../http/auth";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../http/errors";
import type { Logger } from "../../logger";
import type { InvitationCreateInput } from "../../validators/auth/invitation-create.schema";
import type { MailGateway } from "../mail/mail.port";
import type { RateLimiter } from "../rate-limit/rate-limiter.service";
import { toAccountDto, type AccountDto } from "./account.service";
import { invitationLink, invitationMail } from "./auth-mail";
import { consumeTokenConfirmAttempt } from "./auth-rate-limits";
import { generateRawToken, hashToken } from "./user-token.service";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ważność zaproszenia mentora: 14 dni (spec E01, Q11). */
export const MENTOR_INVITATION_TTL_DAYS = 14;
export const MENTOR_INVITATION_TTL_MS = MENTOR_INVITATION_TTL_DAYS * DAY_MS;

export const INVITATION_RACE_MESSAGE = "Zaproszenie dla tego adresu właśnie powstało — odśwież listę";
export const INVITATION_ALREADY_ACCEPTED_MESSAGE = "Zaproszenie zostało już przyjęte";
const INVITATION_NOT_FOUND_MESSAGE = "Nie znaleziono zaproszenia";
/** Jeden komunikat dla każdego nieudanego przyjęcia (wygasłe, cofnięte, przyjęte, zmyślone) — nie zdradza, które to. */
export const INVALID_INVITATION_MESSAGE = "Zaproszenie jest nieważne";

/** Status liczony, nie przechowywany; pierwszeństwo: `accepted` > `revoked` > `expired` > `pending`. */
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Kto przyjął zaproszenie; `mentorRoleRemoved` wyliczane przy odczycie (L10, bez nowej kolumny). */
export interface InvitationAcceptedByDto {
  id: string;
  displayName: string;
  email: string;
  mentorRoleRemoved: boolean;
}

/** Zaproszenie na zewnątrz — jawna lista pól; hash tokenu nigdy tu nie trafia. */
export interface InvitationDto {
  id: string;
  email: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: InvitationAcceptedByDto;
}

/** `link` (z surowym tokenem) istnieje tylko w tej odpowiedzi; `mailFailed` — wysyłka maila się nie udała. */
export interface CreatedInvitationDto {
  invitation: InvitationDto;
  link: string;
  revokedPrevious: boolean;
  mailFailed: boolean;
}

/** Wynik przyjęcia: konto z nową rolą; `alreadyMentor` — konto miało rolę, a zaproszenie i tak zostało zużyte. */
export interface AcceptedInvitationResult {
  account: AccountDto;
  alreadyMentor: boolean;
}

export interface InvitationServiceDependencies {
  em: EntityManager;
  rateLimiter: RateLimiter;
  mailGateway: MailGateway;
  logger: Logger;
  env: Pick<Env, "APP_BASE_URL">;
}

export function invitationStatus(
  invitation: Pick<MentorInvitation, "acceptedAt" | "revokedAt" | "expiresAt">,
  now: number,
): InvitationStatus {
  if (invitation.acceptedAt !== null) {
    return "accepted";
  }
  if (invitation.revokedAt !== null) {
    return "revoked";
  }
  return invitation.expiresAt.getTime() > now ? "pending" : "expired";
}

/**
 * Zaproszenia mentorów. Wszystkie metody są dla operatora — rolę sprawdza trasa przed wywołaniem serwisu.
 * Zegar (`now`) jest osobnym parametrem konstruktora (jak w `UserTokenService`): jedno źródło czasu aplikacji.
 */
export class InvitationService {
  private readonly em: EntityManager;
  private readonly rateLimiter: RateLimiter;
  private readonly mailGateway: MailGateway;
  private readonly logger: Logger;
  private readonly appBaseUrl: string;
  private readonly now: () => number;

  constructor({ em, rateLimiter, mailGateway, logger, env }: InvitationServiceDependencies, now: () => number = Date.now) {
    this.em = em;
    this.rateLimiter = rateLimiter;
    this.mailGateway = mailGateway;
    this.logger = logger;
    this.appBaseUrl = env.APP_BASE_URL;
    this.now = now;
  }

  /**
   * Cofa poprzednie aktywne zaproszenie na adres (także wygasłe, nieprzyjęte) i zapisuje nowe — jedna transakcja.
   * Wyścig dwóch równoczesnych utworzeń kończy się na częściowym UNIQUE: drugie dostaje 409. Mail z linkiem
   * wychodzi po zapisie; jego błąd nie psuje utworzenia (operator widzi `mailFailed` i link w odpowiedzi).
   */
  async create(operatorId: string, input: InvitationCreateInput): Promise<CreatedInvitationDto> {
    const now = this.now();
    const rawToken = generateRawToken();
    let created: { invitation: MentorInvitation; revokedPrevious: boolean };
    try {
      created = await this.em.transactional(async (tx) => {
        const revoked = await tx.nativeUpdate(
          MentorInvitation,
          { email: input.email, acceptedAt: null, revokedAt: null },
          { revokedAt: new Date(now), updatedAt: new Date(now) },
        );
        const invitation = tx.create(MentorInvitation, {
          email: input.email,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(now + MENTOR_INVITATION_TTL_MS),
          createdBy: tx.getReference(User, operatorId),
          // Jawne `null`: encja po `create` nie ma jeszcze tych pól (undefined), a status liczymy z `!== null`.
          revokedAt: null,
          acceptedAt: null,
          acceptedBy: null,
        });
        return { invitation, revokedPrevious: revoked > 0 };
      });
    } catch (error) {
      if (isActiveInvitationConflict(error)) {
        throw new ConflictError(INVITATION_RACE_MESSAGE);
      }
      throw error;
    }

    const mailFailed = !(await this.sendInvitationMail(created.invitation.email, rawToken));
    return {
      invitation: toInvitationDto(created.invitation, now),
      link: invitationLink(this.appBaseUrl, rawToken),
      revokedPrevious: created.revokedPrevious,
      mailFailed,
    };
  }

  /** Wszystkie zaproszenia od najnowszego; `mentorRoleRemoved` z dzisiejszych ról konta, które przyjęło. */
  async list(): Promise<InvitationDto[]> {
    const now = this.now();
    const invitations = await this.em.find(
      MentorInvitation,
      {},
      { orderBy: { createdAt: "desc" }, populate: ["acceptedBy.roles"] },
    );
    return invitations.map((invitation) => toInvitationDto(invitation, now));
  }

  /**
   * Cofa tylko zaproszenie oczekujące — jednym `UPDATE` z warunkiem, więc wyścig z przyjęciem rozstrzyga baza.
   * Zaproszenie już cofnięte lub wygasłe zostaje bez zmian (200); przyjęte → 409; nieznane → 404.
   */
  async revoke(id: string): Promise<void> {
    const now = new Date(this.now());
    const revoked = await this.em.nativeUpdate(
      MentorInvitation,
      { id, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } },
      { revokedAt: now, updatedAt: now },
    );
    if (revoked > 0) {
      return;
    }
    const existing = await this.em.findOne(MentorInvitation, { id });
    if (!existing) {
      throw new NotFoundError(INVITATION_NOT_FOUND_MESSAGE);
    }
    if (existing.acceptedAt !== null) {
      throw new ConflictError(INVITATION_ALREADY_ACCEPTED_MESSAGE);
    }
  }

  /**
   * Przyjęcie zaproszenia przez zalogowane konto (nie operatora — Q17). Limiter liczy każdą próbę (`token-confirm:ip`).
   * Rola operatora jest sprawdzana przed zużyciem tokenu: operator nie spala cudzego linku. W jednej transakcji:
   * (1) jeden `UPDATE` zajmuje zaproszenie (nieprzyjęte, niecofnięte, niewygasłe) — z dwóch równoczesnych prób
   * z jednym tokenem wygrywa dokładnie jedna; brak wiersza → „Zaproszenie jest nieważne”; (2) `INSERT` roli mentora
   * z `ON CONFLICT DO NOTHING`. Konto, które już jest mentorem, też zużywa zaproszenie (`alreadyMentor`).
   */
  async accept(userId: string, rawToken: string, clientIp: string): Promise<AcceptedInvitationResult> {
    consumeTokenConfirmAttempt(this.rateLimiter, clientIp);

    const user = await this.em.findOne(User, { id: userId }, { populate: ["roles"] });
    if (!user) {
      throw new UnauthorizedError();
    }
    const roles = user.roles.getItems().map((entry): Role => entry.role);
    if (roles.includes("operator")) {
      throw new ForbiddenError();
    }
    const alreadyMentor = roles.includes("mentor");

    const now = new Date(this.now());
    const tokenHash = hashToken(rawToken);
    await this.em.transactional(async (tx) => {
      const claimed = await tx.nativeUpdate(
        MentorInvitation,
        { tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } },
        { acceptedAt: now, acceptedBy: userId, updatedAt: now },
      );
      if (claimed === 0) {
        throw new ValidationError(INVALID_INVITATION_MESSAGE);
      }
      // Zaproszenie zajęte wyżej przez to konto — odczyt autora (operatora) do `granted_by`.
      const invitation = await tx.findOneOrFail(MentorInvitation, { tokenHash });
      await tx.upsert(
        UserRole,
        { user: userId, role: "mentor", grantedBy: invitation.createdBy ?? null },
        { onConflictFields: ["user", "role"], onConflictAction: "ignore" },
      );
    });

    const granted = new Set<Role>([...roles, "mentor"]);
    return { account: toAccountDto(user, USER_ROLES.filter((role) => granted.has(role))), alreadyMentor };
  }

  /** `true`, gdy wiadomość wyszła; błąd logujemy bez adresata, treści i tokenu. */
  private async sendInvitationMail(to: string, rawToken: string): Promise<boolean> {
    try {
      await this.mailGateway.send(
        invitationMail({ to, appBaseUrl: this.appBaseUrl, rawToken, validDays: MENTOR_INVITATION_TTL_DAYS }),
      );
      return true;
    } catch (error) {
      this.logger.error({ err: error, mail: "mentor_invitation" }, "Nie udało się wysłać zaproszenia mentora");
      return false;
    }
  }
}

function isActiveInvitationConflict(error: unknown): boolean {
  return (
    error instanceof UniqueConstraintViolationException &&
    "constraint" in error &&
    error.constraint === MENTOR_INVITATION_ACTIVE_EMAIL_CONSTRAINT
  );
}

function toInvitationDto(invitation: MentorInvitation, now: number): InvitationDto {
  const status = invitationStatus(invitation, now);
  const accepter = invitation.acceptedBy;
  return {
    id: invitation.id,
    email: invitation.email,
    status,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    ...(status === "accepted" && accepter && { acceptedBy: toAcceptedByDto(accepter) }),
  };
}

function toAcceptedByDto(user: User): InvitationAcceptedByDto {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    mentorRoleRemoved: !user.roles.getItems().some((entry) => entry.role === "mentor"),
  };
}
