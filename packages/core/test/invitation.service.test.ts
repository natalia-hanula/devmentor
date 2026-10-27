import { MentorInvitation, User } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  createLogger,
  hashToken,
  INVITATION_ALREADY_ACCEPTED_MESSAGE,
  INVITATION_MAIL_SUBJECT,
  INVITATION_RACE_MESSAGE,
  InvitationService,
  invitationStatus,
  MENTOR_INVITATION_TTL_MS,
  NotFoundError,
  type InvitationServiceDependencies,
} from "../src";
import { createFakeEntityManager, uniqueViolation } from "./fake-entity-manager";

const OPERATOR_ID = "0b0e5a8e-6a43-4c1a-9f0e-6f2f9b1c7d11";
const INVITATION_ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const NOW = Date.parse("2026-10-27T12:00:00.000Z");
const APP_BASE_URL = "https://devmentor.example";
const INPUT = { email: "adam.nowy@example.com" };

function setup() {
  const { fake, em } = createFakeEntityManager();
  const logLines: string[] = [];
  const mailGateway = { send: vi.fn(async () => undefined) };
  const deps = {
    em,
    mailGateway,
    logger: createLogger({ level: "trace", destination: { write: (line: string) => logLines.push(line) } }),
    env: { APP_BASE_URL },
  } satisfies InvitationServiceDependencies;
  return { fake, mailGateway, logLines, service: new InvitationService(deps, () => NOW) };
}

/** Zaproszenie z bazy; domyślnie oczekujące. */
function stored(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INVITATION_ID,
    email: "adam.nowy@example.com",
    tokenHash: "h".repeat(64),
    createdAt: new Date("2026-10-20T08:00:00.000Z"),
    expiresAt: new Date(NOW + 1000),
    revokedAt: null,
    acceptedAt: null,
    acceptedBy: null,
    ...overrides,
  };
}

function accepter(roles: string[]) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    displayName: "Ewa",
    email: "ewa@example.com",
    roles: { getItems: () => roles.map((role) => ({ role })) },
  };
}

function tokenFromLink(link: string): string {
  return new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;
}

describe("invitationStatus", () => {
  const base = { acceptedAt: null, revokedAt: null, expiresAt: new Date(NOW + 1) };

  it.each([
    ["oczekujące", base, "pending"],
    ["wygasłe (nieprzyjęte)", { ...base, expiresAt: new Date(NOW) }, "expired"],
    ["cofnięte", { ...base, revokedAt: new Date(NOW) }, "revoked"],
    ["cofnięte ma pierwszeństwo przed wygasłym", { ...base, revokedAt: new Date(NOW), expiresAt: new Date(NOW - 1) }, "revoked"],
    ["przyjęte", { ...base, acceptedAt: new Date(NOW) }, "accepted"],
    ["przyjęte ma pierwszeństwo przed cofniętym i wygasłym", { acceptedAt: new Date(NOW), revokedAt: new Date(NOW), expiresAt: new Date(NOW - 1) }, "accepted"],
  ] as const)("%s → %s", (_name, invitation, status) => {
    expect(invitationStatus(invitation, NOW)).toBe(status);
  });
});

describe("InvitationService.create", () => {
  it("w jednej transakcji cofa poprzednie aktywne zaproszenie na adres i zapisuje nowe (14 dni, hash tokenu, autor)", async () => {
    const { fake, service } = setup();
    fake.nativeUpdate.mockResolvedValue(1);

    const result = await service.create(OPERATOR_ID, INPUT);

    expect(fake.transactional).toHaveBeenCalledOnce();
    expect(fake.nativeUpdate).toHaveBeenCalledWith(
      MentorInvitation,
      { email: INPUT.email, acceptedAt: null, revokedAt: null },
      { revokedAt: new Date(NOW), updatedAt: new Date(NOW) },
    );
    expect(fake.getReference).toHaveBeenCalledWith(User, OPERATOR_ID);
    expect(fake.create).toHaveBeenCalledWith(
      MentorInvitation,
      expect.objectContaining({
        email: INPUT.email,
        expiresAt: new Date(NOW + MENTOR_INVITATION_TTL_MS),
        createdBy: { id: OPERATOR_ID },
        revokedAt: null,
        acceptedAt: null,
        acceptedBy: null,
      }),
    );
    expect(MENTOR_INVITATION_TTL_MS).toBe(14 * 24 * 60 * 60 * 1000);
    expect(result.revokedPrevious).toBe(true);
    expect(result.invitation).toMatchObject({ email: INPUT.email, status: "pending" });
    expect(result.invitation.expiresAt).toBe(new Date(NOW + MENTOR_INVITATION_TTL_MS).toISOString());
  });

  it("brak poprzedniego aktywnego zaproszenia → revokedPrevious: false", async () => {
    const { fake, service } = setup();
    fake.nativeUpdate.mockResolvedValue(0);

    await expect(service.create(OPERATOR_ID, INPUT)).resolves.toMatchObject({ revokedPrevious: false });
  });

  it("link z tokenem we fragmencie jest tylko w odpowiedzi, w bazie ląduje wyłącznie hash", async () => {
    const { fake, service } = setup();

    const { link } = await service.create(OPERATOR_ID, INPUT);

    const url = new URL(link);
    expect(url.origin + url.pathname).toBe(`${APP_BASE_URL}/invite`);
    expect(url.search).toBe("");
    const token = tokenFromLink(link);
    expect(token).toHaveLength(43);
    const [, data] = fake.create.mock.calls[0] as unknown as [unknown, { tokenHash: string }];
    expect(data.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(fake.create.mock.calls)).not.toContain(token);
  });

  it("DTO nie zawiera hasha tokenu ani linku z tokenem", async () => {
    const { service } = setup();

    const { invitation } = await service.create(OPERATOR_ID, INPUT);

    expect(Object.keys(invitation).sort()).toEqual(["createdAt", "email", "expiresAt", "id", "status"]);
  });

  it("po zapisie wysyła mail z tym samym linkiem; mailFailed: false", async () => {
    const { service, mailGateway } = setup();

    const result = await service.create(OPERATOR_ID, INPUT);

    expect(result.mailFailed).toBe(false);
    const [message] = mailGateway.send.mock.calls[0] as unknown as [{ to: string; subject: string; text: string }];
    expect(message.to).toBe(INPUT.email);
    expect(message.subject).toBe(INVITATION_MAIL_SUBJECT);
    expect(message.text).toContain(result.link);
    expect(message.text).toContain("ważny 14 dni");
  });

  it("błąd poczty nie psuje utworzenia: mailFailed: true, link w odpowiedzi, log bez adresata i tokenu", async () => {
    const { service, mailGateway, logLines } = setup();
    mailGateway.send.mockRejectedValue(new Error("SMTP niedostępny"));

    const result = await service.create(OPERATOR_ID, INPUT);

    expect(result.mailFailed).toBe(true);
    expect(result.link).toContain("/invite#token=");
    const logs = logLines.join("");
    expect(logs).toContain("Nie udało się wysłać zaproszenia mentora");
    expect(logs).not.toContain(INPUT.email);
    expect(logs).not.toContain(tokenFromLink(result.link));
  });

  it("wyścig: naruszenie częściowego UNIQUE → 409 „odśwież listę”, bez maila", async () => {
    const { fake, service, mailGateway } = setup();
    fake.transactional.mockRejectedValue(uniqueViolation("mentor_invitations_email_active_unique"));

    const error = await service.create(OPERATOR_ID, INPUT).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ message: INVITATION_RACE_MESSAGE });
    expect(INVITATION_RACE_MESSAGE).toBe("Zaproszenie dla tego adresu właśnie powstało — odśwież listę");
    expect(mailGateway.send).not.toHaveBeenCalled();
  });

  it.each([
    ["inne naruszenie unikalności (token_hash)", uniqueViolation("mentor_invitations_token_hash_unique")],
    ["błąd bazy", new Error("connect ECONNRESET")],
  ])("%s → błąd leci dalej bez zmian", async (_name, failure) => {
    const { fake, service } = setup();
    fake.transactional.mockRejectedValue(failure);

    await expect(service.create(OPERATOR_ID, INPUT)).rejects.toBe(failure);
  });

  it("domyślnie liczy czas zegarem systemowym", async () => {
    const { fake, em } = createFakeEntityManager();
    const service = new InvitationService({
      em,
      mailGateway: { send: vi.fn(async () => undefined) },
      logger: createLogger({ level: "silent" }),
      env: { APP_BASE_URL },
    });
    const before = Date.now();

    await service.create(OPERATOR_ID, INPUT);

    const [, data] = fake.create.mock.calls[0] as unknown as [unknown, { expiresAt: Date }];
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + MENTOR_INVITATION_TTL_MS);
  });
});

describe("InvitationService.list", () => {
  it("zwraca zaproszenia od najnowszego z wyliczonym statusem; doładowuje konto przyjmujące i jego role", async () => {
    const { fake, service } = setup();
    fake.find.mockResolvedValue([
      stored(),
      stored({ id: "b", revokedAt: new Date(NOW - 5) }),
      stored({ id: "c", expiresAt: new Date(NOW - 5) }),
    ]);

    const result = await service.list();

    expect(fake.find).toHaveBeenCalledWith(MentorInvitation, {}, { orderBy: { createdAt: "desc" }, populate: ["acceptedBy.roles"] });
    expect(result.map((entry) => entry.status)).toEqual(["pending", "revoked", "expired"]);
    expect(result[0]).toEqual({
      id: INVITATION_ID,
      email: "adam.nowy@example.com",
      status: "pending",
      createdAt: "2026-10-20T08:00:00.000Z",
      expiresAt: new Date(NOW + 1000).toISOString(),
    });
  });

  it("przyjęte: acceptedBy z mentorRoleRemoved wyliczanym z dzisiejszych ról konta (L10)", async () => {
    const { fake, service } = setup();
    fake.find.mockResolvedValue([
      stored({ id: "a", acceptedAt: new Date(NOW - 10), acceptedBy: accepter(["mentee", "mentor"]) }),
      stored({ id: "b", acceptedAt: new Date(NOW - 10), acceptedBy: accepter(["mentee"]) }),
    ]);

    const [withRole, withoutRole] = await service.list();

    expect(withRole!.acceptedBy).toEqual({
      id: "11111111-2222-4333-8444-555555555555",
      displayName: "Ewa",
      email: "ewa@example.com",
      mentorRoleRemoved: false,
    });
    expect(withoutRole!.acceptedBy).toMatchObject({ mentorRoleRemoved: true });
  });

  it("acceptedBy tylko dla przyjętych; przyjęte przez usunięte konto → bez acceptedBy", async () => {
    const { fake, service } = setup();
    fake.find.mockResolvedValue([
      stored({ acceptedBy: accepter(["mentee"]) }),
      stored({ id: "b", acceptedAt: new Date(NOW - 10), acceptedBy: null }),
    ]);

    const [pendingWithAccepter, acceptedByDeleted] = await service.list();

    expect(pendingWithAccepter).not.toHaveProperty("acceptedBy");
    expect(acceptedByDeleted).toMatchObject({ status: "accepted" });
    expect(acceptedByDeleted).not.toHaveProperty("acceptedBy");
  });

  it("nie zwraca hasha tokenu ani linku", async () => {
    const { fake, service } = setup();
    fake.find.mockResolvedValue([stored()]);

    expect(JSON.stringify(await service.list())).not.toContain("h".repeat(64));
  });
});

describe("InvitationService.revoke", () => {
  it("cofa oczekujące zaproszenie jednym UPDATE z warunkiem (nieprzyjęte, niecofnięte, niewygasłe)", async () => {
    const { fake, service } = setup();
    fake.nativeUpdate.mockResolvedValue(1);

    await expect(service.revoke(INVITATION_ID)).resolves.toBeUndefined();

    expect(fake.nativeUpdate).toHaveBeenCalledWith(
      MentorInvitation,
      { id: INVITATION_ID, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date(NOW) } },
      { revokedAt: new Date(NOW), updatedAt: new Date(NOW) },
    );
    expect(fake.findOne).not.toHaveBeenCalled();
  });

  it("nieznane zaproszenie → 404", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(null);

    await expect(service.revoke(INVITATION_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("przyjęte → 409 „Zaproszenie zostało już przyjęte”", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(stored({ acceptedAt: new Date(NOW - 10) }));

    const error = await service.revoke(INVITATION_ID).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ message: INVITATION_ALREADY_ACCEPTED_MESSAGE });
    expect(INVITATION_ALREADY_ACCEPTED_MESSAGE).toBe("Zaproszenie zostało już przyjęte");
  });

  it.each([
    ["już cofnięte", { revokedAt: new Date(NOW - 10) }],
    ["wygasłe", { expiresAt: new Date(NOW - 10) }],
  ])("%s → 200 bez zmian (cofamy tylko oczekujące)", async (_name, overrides) => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(stored(overrides));

    await expect(service.revoke(INVITATION_ID)).resolves.toBeUndefined();
    expect(fake.nativeUpdate).toHaveBeenCalledOnce();
  });
});
