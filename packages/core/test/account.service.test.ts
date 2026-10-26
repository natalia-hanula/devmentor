import { UniqueConstraintViolationException, User, UserRole } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";
import {
  AccountService,
  ConflictError,
  INVALID_CREDENTIALS_MESSAGE,
  PasswordHasher,
  RateLimiter,
  TooManyRequestsError,
  UnauthorizedError,
} from "../src";
import { createFakeEntityManager } from "./fake-entity-manager";

const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const IP = "203.0.113.7";
const PASSWORD_HASH = "$2b$12$abcdefghijklmnopqrstuuMBnXfJ6sFhP9pW8bq3C6m3Y4l2oQx1e";

function setup({ verifies = true }: { verifies?: boolean } = {}) {
  const { fake, em } = createFakeEntityManager();
  const created = new Date("2026-10-26T10:00:00.000Z");
  fake.create.mockImplementation((_entity: unknown, data: Record<string, unknown>) => ({
    id: ID,
    createdAt: created,
    updatedAt: created,
    sessionVersion: 1,
    ...data,
  }));
  const passwordHasher = {
    hash: vi.fn(async () => PASSWORD_HASH),
    verify: vi.fn(async () => verifies),
  };
  const rateLimiter = new RateLimiter(() => 0);
  const service = new AccountService({ em, passwordHasher: passwordHasher as unknown as PasswordHasher, rateLimiter });
  return { fake, service, passwordHasher, rateLimiter };
}

function storedUser(overrides: Record<string, unknown> = {}, roles: string[] = ["mentee"]) {
  return {
    id: ID,
    email: "ola@example.com",
    displayName: "Ola",
    passwordHash: PASSWORD_HASH,
    emailVerifiedAt: null,
    sessionVersion: 3,
    roles: { getItems: () => roles.map((role) => ({ role })) },
    ...overrides,
  };
}

const REGISTER = { email: "ola@example.com", password: "dlugie-haslo-123", displayName: "Ola" };
const LOGIN = { email: "ola@example.com", password: "dlugie-haslo-123" };

describe("AccountService.register", () => {
  it("tworzy konto ze znormalizowanym e-mailem, hashem hasła i rolą mentee w jednym flush", async () => {
    const { fake, service, passwordHasher } = setup();

    const result = await service.register({ ...REGISTER, email: "  Ola@Example.COM " }, IP);

    expect(passwordHasher.hash).toHaveBeenCalledWith("dlugie-haslo-123");
    expect(fake.create).toHaveBeenNthCalledWith(1, User, {
      email: "ola@example.com",
      displayName: "Ola",
      passwordHash: PASSWORD_HASH,
      emailVerifiedAt: null,
    });
    const user = fake.create.mock.results[0]?.value as unknown;
    expect(fake.create).toHaveBeenNthCalledWith(2, UserRole, { user, role: "mentee", grantedBy: null });
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(result).toEqual({
      account: {
        id: ID,
        email: "ola@example.com",
        displayName: "Ola",
        roles: ["mentee"],
        emailVerified: false,
        hasPassword: true,
      },
      session: { id: ID, sessionVersion: 1 },
    });
  });

  it("DTO nie zawiera hasha ani hasła", async () => {
    const { service } = setup();

    const { account } = await service.register(REGISTER, IP);

    expect(JSON.stringify(account)).not.toContain(PASSWORD_HASH);
    expect(JSON.stringify(account)).not.toContain(REGISTER.password);
    expect(Object.keys(account).sort()).toEqual(["displayName", "email", "emailVerified", "hasPassword", "id", "roles"]);
  });

  it("naruszenie unikalności przy zapisie → 409 z błędem przy polu email (constraint, bez zapytania wcześniej)", async () => {
    const { fake, service } = setup();
    fake.flush.mockRejectedValue(new UniqueConstraintViolationException(new Error("duplicate key users_email_lower_unique")));

    const error = await service.register(REGISTER, IP).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ message: "Ten e-mail ma już konto", fieldErrors: { email: ["Ten e-mail ma już konto"] } });
    expect(fake.findOne).not.toHaveBeenCalled();
    expect(fake.find).not.toHaveBeenCalled();
  });

  it("inne błędy zapisu lecą dalej bez zmian", async () => {
    const { fake, service } = setup();
    const failure = new Error("disk full");
    fake.flush.mockRejectedValue(failure);

    await expect(service.register(REGISTER, IP)).rejects.toBe(failure);
  });

  it("limiter (register:email) działa przed hashowaniem i zapisem, na znormalizowanym adresie", async () => {
    const { fake, service, passwordHasher } = setup();
    await service.register(REGISTER, "203.0.113.1");
    await service.register(REGISTER, "203.0.113.2");
    await service.register(REGISTER, "203.0.113.3");
    passwordHasher.hash.mockClear();
    fake.create.mockClear();

    await expect(service.register({ ...REGISTER, email: "OLA@example.com " }, "203.0.113.4")).rejects.toBeInstanceOf(
      TooManyRequestsError,
    );
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(fake.create).not.toHaveBeenCalled();
  });
});

describe("AccountService.login", () => {
  it("szuka po znormalizowanym e-mailu i przy poprawnym haśle zwraca konto z rolami i wersją sesji", async () => {
    const { fake, service, passwordHasher } = setup();
    fake.findOne.mockResolvedValue(storedUser({ emailVerifiedAt: new Date() }, ["mentor", "mentee"]));

    const result = await service.login({ ...LOGIN, email: " OLA@example.com" }, IP);

    expect(fake.findOne).toHaveBeenCalledWith(User, { email: "ola@example.com" }, { populate: ["roles"] });
    expect(passwordHasher.verify).toHaveBeenCalledWith(LOGIN.password, PASSWORD_HASH);
    expect(result).toEqual({
      account: {
        id: ID,
        email: "ola@example.com",
        displayName: "Ola",
        roles: ["mentee", "mentor"],
        emailVerified: true,
        hasPassword: true,
      },
      session: { id: ID, sessionVersion: 3 },
    });
  });

  it.each([
    ["nieznany e-mail", null, false],
    ["złe hasło", storedUser(), false],
    ["konto bez hasła", storedUser({ passwordHash: null }), false],
  ])("%s → ten sam 401, a verify wołane zawsze", async (_case, user, verifies) => {
    const { fake, service, passwordHasher } = setup({ verifies });
    fake.findOne.mockResolvedValue(user);

    const error = await service.login(LOGIN, IP).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect((error as UnauthorizedError).message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(INVALID_CREDENTIALS_MESSAGE).toBe("Nieprawidłowy e-mail lub hasło");
    expect(passwordHasher.verify).toHaveBeenCalledOnce();
    expect(passwordHasher.verify).toHaveBeenCalledWith(LOGIN.password, user?.passwordHash ?? null);
  });

  it("konto bez hasła z prawdziwym PasswordHasher: porównanie z atrapą i 401", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.findOne.mockResolvedValue(storedUser({ passwordHash: null }));
    const service = new AccountService({ em, passwordHasher: new PasswordHasher(), rateLimiter: new RateLimiter() });

    await expect(service.login(LOGIN, IP)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("każda próba liczy się przed sprawdzeniem hasła — szósta (nawet z poprawnym hasłem) → 429 bez zapytania", async () => {
    const { fake, service, passwordHasher } = setup({ verifies: false });
    fake.findOne.mockResolvedValue(storedUser());
    for (let i = 0; i < 5; i += 1) {
      await expect(service.login(LOGIN, IP)).rejects.toBeInstanceOf(UnauthorizedError);
    }
    passwordHasher.verify.mockResolvedValue(true);
    fake.findOne.mockClear();

    await expect(service.login({ ...LOGIN, email: "Ola@Example.com" }, IP)).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(fake.findOne).not.toHaveBeenCalled();
  });
});

describe("AccountService.me", () => {
  it("zwraca DTO własnego konta (role w stałej kolejności, bez hasha)", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(storedUser({ passwordHash: null }, ["operator"]));

    const account = await service.me(ID);

    expect(fake.findOne).toHaveBeenCalledWith(User, { id: ID }, { populate: ["roles"] });
    expect(account).toEqual({
      id: ID,
      email: "ola@example.com",
      displayName: "Ola",
      roles: ["operator"],
      emailVerified: false,
      hasPassword: false,
    });
  });

  it("konto usunięte w trakcie sesji → 401 (fail closed)", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(null);

    await expect(service.me(ID)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
