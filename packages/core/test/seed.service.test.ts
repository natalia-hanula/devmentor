import { User, UserRole, UserToken } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  isSeedAllowed,
  SEED_FORBIDDEN_MESSAGE,
  SeedService,
  ValidationError,
  type AccountService,
  type Env,
  type PasswordHasher,
} from "../src";
import { createFakeEntityManager, uniqueViolation } from "./fake-entity-manager";

const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const PASSWORD_HASH = "$2b$12$abcdefghijklmnopqrstuuMBnXfJ6sFhP9pW8bq3C6m3Y4l2oQx1e";
const INPUT = { email: "  Mentee.Test@Example.COM ", displayName: "  Mentee testowe ", password: "test-haslo-nie-sekret" };
const OPERATOR_EMAIL = "operator.test@example.com";

function setup(appEnv: Env["APP_ENV"] = "local") {
  const { fake, em } = createFakeEntityManager();
  const passwordHasher = { hash: vi.fn(async () => PASSWORD_HASH), verify: vi.fn() };
  const operatorAccount = { id: ID, email: OPERATOR_EMAIL, roles: ["operator"] };
  const accountService = { createOperator: vi.fn(async () => operatorAccount) };
  const service = new SeedService({
    em,
    passwordHasher: passwordHasher as unknown as PasswordHasher,
    accountService: accountService as unknown as AccountService,
    env: { APP_ENV: appEnv },
  });
  return { fake, service, passwordHasher, accountService, operatorAccount };
}

function storedOperator(roles: string[] = ["operator"]) {
  return { id: "operator-id", email: OPERATOR_EMAIL, roles: { getItems: () => roles.map((role) => ({ role })) } };
}

describe("SeedService — dozwolone tylko local i test (fail closed w core)", () => {
  it.each([
    ["createOperator", (service: SeedService) => service.createOperator(INPUT)],
    ["createMentee", (service: SeedService) => service.createMentee(INPUT, false)],
    ["createMentor", (service: SeedService) => service.createMentor(INPUT, OPERATOR_EMAIL)],
  ])("%s przy APP_ENV=staging → ForbiddenError, bez odczytu, hashowania i zapisu", async (_name, call) => {
    const { fake, service, passwordHasher, accountService } = setup("staging");

    const error = await call(service).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ message: SEED_FORBIDDEN_MESSAGE });
    expect(accountService.createOperator).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(fake.findOne).not.toHaveBeenCalled();
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.flush).not.toHaveBeenCalled();
  });

  it("APP_ENV=production → ForbiddenError", async () => {
    const { service } = setup("production");

    await expect(service.createMentee(INPUT, true)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each([
    ["local", true],
    ["test", true],
    ["staging", false],
    ["production", false],
  ] as const)("isSeedAllowed(%s) → %s", (appEnv, allowed) => {
    expect(isSeedAllowed(appEnv)).toBe(allowed);
  });

  it.each(["local", "test"] as const)("APP_ENV=%s → działa", async (appEnv) => {
    const { service } = setup(appEnv);

    await expect(service.createMentee(INPUT, true)).resolves.toMatchObject({ roles: ["mentee"] });
  });
});

describe("SeedService.createOperator", () => {
  it("deleguje do AccountService.createOperator (ta sama droga co CLI)", async () => {
    const { service, accountService, operatorAccount } = setup();

    await expect(service.createOperator(INPUT)).resolves.toBe(operatorAccount);
    expect(accountService.createOperator).toHaveBeenCalledWith(INPUT);
  });
});

describe("SeedService.createMentee", () => {
  it("jak rejestracja (normalizacja, hash, rola mentee), ale z potwierdzonym adresem — bez tokenu", async () => {
    const { fake, service, passwordHasher } = setup();
    const before = Date.now();

    const account = await service.createMentee(INPUT, true);

    expect(passwordHasher.hash).toHaveBeenCalledWith("test-haslo-nie-sekret");
    expect(fake.create).toHaveBeenCalledTimes(2);
    expect(fake.create).toHaveBeenNthCalledWith(1, User, {
      email: "mentee.test@example.com",
      displayName: "Mentee testowe",
      passwordHash: PASSWORD_HASH,
      emailVerifiedAt: expect.any(Date),
    });
    const user = fake.create.mock.results[0]?.value as { emailVerifiedAt: Date };
    expect(user.emailVerifiedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(fake.create).toHaveBeenNthCalledWith(2, UserRole, { user, role: "mentee", grantedBy: null });
    expect(fake.create).not.toHaveBeenCalledWith(UserToken, expect.anything());
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(account).toEqual({
      id: ID,
      email: "mentee.test@example.com",
      displayName: "Mentee testowe",
      roles: ["mentee"],
      emailVerified: true,
      hasPassword: true,
    });
    expect(JSON.stringify(account)).not.toContain(PASSWORD_HASH);
  });

  it("emailVerified: false → adres niepotwierdzony (emailVerifiedAt null), rola mentee, bez tokenu", async () => {
    const { fake, service } = setup();

    const account = await service.createMentee(
      { ...INPUT, email: "mentee.niepotwierdzone@example.com", displayName: "Mentee z niepotwierdzonym adresem" },
      false,
    );

    expect(fake.create).toHaveBeenCalledTimes(2);
    expect(fake.create).toHaveBeenNthCalledWith(1, User, {
      email: "mentee.niepotwierdzone@example.com",
      displayName: "Mentee z niepotwierdzonym adresem",
      passwordHash: PASSWORD_HASH,
      emailVerifiedAt: null,
    });
    const user = fake.create.mock.results[0]?.value as unknown;
    expect(fake.create).toHaveBeenNthCalledWith(2, UserRole, { user, role: "mentee", grantedBy: null });
    expect(fake.create).not.toHaveBeenCalledWith(UserToken, expect.anything());
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(account).toMatchObject({
      email: "mentee.niepotwierdzone@example.com",
      roles: ["mentee"],
      emailVerified: false,
      hasPassword: true,
    });
  });

  it("waliduje wejście schematem rejestracji — nic nie hashuje ani nie zapisuje", async () => {
    const { fake, service, passwordHasher } = setup();

    const error = await service
      .createMentee({ email: "zly", displayName: " ", password: "krotkie" }, true)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(fake.flush).not.toHaveBeenCalled();
  });

  it("zajęty e-mail → ConflictError z constraintu (bez zapytania wcześniej)", async () => {
    const { fake, service } = setup();
    fake.flush.mockRejectedValue(uniqueViolation("users_email_lower_unique"));

    await expect(service.createMentee(INPUT, true)).rejects.toBeInstanceOf(ConflictError);
    expect(fake.findOne).not.toHaveBeenCalled();
  });
});

describe("SeedService.createMentor", () => {
  it("role mentee + mentor, mentor z granted_by = konto operatora (szukane po znormalizowanym e-mailu)", async () => {
    const { fake, service } = setup();
    const operator = storedOperator();
    fake.findOne.mockResolvedValue(operator);

    const account = await service.createMentor({ ...INPUT, email: "mentor.test@example.com" }, " Operator.Test@example.com ");

    expect(fake.findOne).toHaveBeenCalledWith(User, { email: OPERATOR_EMAIL }, { populate: ["roles"] });
    const user = fake.create.mock.results[0]?.value as { emailVerifiedAt: Date | null };
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(fake.create).toHaveBeenCalledTimes(3);
    expect(fake.create).toHaveBeenNthCalledWith(2, UserRole, { user, role: "mentee", grantedBy: null });
    expect(fake.create).toHaveBeenNthCalledWith(3, UserRole, { user, role: "mentor", grantedBy: operator });
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(account).toMatchObject({ email: "mentor.test@example.com", roles: ["mentee", "mentor"], emailVerified: true });
  });

  it.each([
    ["brak konta", null],
    ["konto bez roli operator", storedOperator(["mentee"])],
  ])("%s pod adresem nadającego → NotFoundError, nic nie zapisuje", async (_name, found) => {
    const { fake, service, passwordHasher } = setup();
    fake.findOne.mockResolvedValue(found);

    const error = await service.createMentor(INPUT, OPERATOR_EMAIL).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({ message: expect.stringContaining(OPERATOR_EMAIL) });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.flush).not.toHaveBeenCalled();
  });

  it("zajęty e-mail mentora → ConflictError (idempotentny seed)", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(storedOperator());
    fake.flush.mockRejectedValue(uniqueViolation("users_email_unique"));

    await expect(service.createMentor(INPUT, OPERATOR_EMAIL)).rejects.toBeInstanceOf(ConflictError);
  });
});
