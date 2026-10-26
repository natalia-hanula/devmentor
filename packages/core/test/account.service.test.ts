import { UniqueConstraintViolationException, User, UserRole, UserToken, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";
import {
  AccountService,
  ConflictError,
  createLogger,
  EMAIL_VERIFICATION_TTL_MS,
  hashToken,
  INVALID_CREDENTIALS_MESSAGE,
  PasswordHasher,
  RateLimiter,
  TooManyRequestsError,
  UnauthorizedError,
  UserTokenService,
  ValidationError,
  type AccountServiceDependencies,
} from "../src";
import { createFakeEntityManager, createFakeQueryBuilder } from "./fake-entity-manager";

const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const NOW = Date.parse("2026-10-26T12:00:00.000Z");
const APP_BASE_URL = "https://devmentor.example";
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
  const deps = otherDependencies(em);
  const service = new AccountService({ ...deps, em, passwordHasher: passwordHasher as unknown as PasswordHasher, rateLimiter });
  return { fake, service, passwordHasher, rateLimiter, ...deps };
}

/** Prawdziwy `UserTokenService` na atrapie EM (stały zegar), atrapa poczty i logger zapisujący linie. */
function otherDependencies(em: EntityManager) {
  const logLines: string[] = [];
  const mailGateway = { send: vi.fn(async () => undefined) };
  return {
    logLines,
    mailGateway,
    userTokenService: new UserTokenService({ em }, () => NOW),
    logger: createLogger({ level: "trace", destination: { write: (line: string) => logLines.push(line) } }),
    env: { APP_BASE_URL },
  } satisfies Omit<AccountServiceDependencies, "em" | "passwordHasher" | "rateLimiter"> & { logLines: string[] };
}

/** Surowy token z linku w treści maila (fragment `#token=`). */
function tokenFromMail(text: string): string {
  const link = /https:\/\/\S+/.exec(text)?.[0];
  expect(link).toBeDefined();
  return new URLSearchParams(new URL(link!).hash.slice(1)).get("token")!;
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
  it("token weryfikacji powstaje w tym samym flush co konto; mail z linkiem wychodzi dopiero po zapisie", async () => {
    const { fake, service, mailGateway } = setup();
    const order: string[] = [];
    fake.flush.mockImplementation(async () => {
      order.push("flush");
    });
    mailGateway.send.mockImplementation(async () => {
      order.push("mail");
    });

    await service.register(REGISTER, IP);

    const user = fake.create.mock.results[0]?.value as unknown;
    expect(fake.create).toHaveBeenNthCalledWith(3, UserToken, {
      user,
      purpose: "email_verification",
      tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      expiresAt: new Date(NOW + EMAIL_VERIFICATION_TTL_MS),
    });
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(fake.upsert).not.toHaveBeenCalled();
    expect(order).toEqual(["flush", "mail"]);
    expect(mailGateway.send).toHaveBeenCalledWith({
      to: "ola@example.com",
      subject: "Potwierdź adres e-mail",
      text: expect.stringContaining(`${APP_BASE_URL}/verify-email#token=`),
    });
    const [message] = mailGateway.send.mock.calls[0] as unknown as [{ text: string }];
    const tokenData = fake.create.mock.calls[2]?.[1] as { tokenHash: string };
    expect(hashToken(tokenFromMail(message.text))).toBe(tokenData.tokenHash);
  });

  it("nieudany zapis (zajęty e-mail) → żadnego maila", async () => {
    const { fake, service, mailGateway } = setup();
    fake.flush.mockRejectedValue(new UniqueConstraintViolationException(new Error("duplicate key")));

    await expect(service.register(REGISTER, IP)).rejects.toBeInstanceOf(ConflictError);
    expect(mailGateway.send).not.toHaveBeenCalled();
  });

  it("błąd poczty nie psuje rejestracji — konto zwrócone, błąd w logu z kontekstem, bez adresata i tokenu", async () => {
    const { service, mailGateway, logLines } = setup();
    mailGateway.send.mockRejectedValue(new Error("SMTP niedostępny"));

    const result = await service.register(REGISTER, IP);

    expect(result.account.email).toBe("ola@example.com");
    const [message] = mailGateway.send.mock.calls[0] as unknown as [{ text: string }];
    const logs = logLines.join("");
    expect(logs).toContain("Nie udało się wysłać linku weryfikacyjnego");
    expect(logs).toContain("SMTP niedostępny");
    expect(logs).toContain(ID);
    expect(logs).not.toContain("ola@example.com");
    expect(logs).not.toContain(tokenFromMail(message.text));
    expect(logs).not.toContain("verify-email");
  });
});

describe("AccountService.resendVerification", () => {
  it("niepotwierdzony adres → nowy token upsertem (stary przestaje działać) i mail z nowym linkiem", async () => {
    const { fake, service, mailGateway } = setup();
    fake.findOne.mockResolvedValue(storedUser());

    await service.resendVerification(ID);

    expect(fake.findOne).toHaveBeenCalledWith(User, { id: ID });
    expect(fake.upsert).toHaveBeenCalledWith(
      UserToken,
      expect.objectContaining({ user: ID, purpose: "email_verification", expiresAt: new Date(NOW + EMAIL_VERIFICATION_TTL_MS) }),
      expect.objectContaining({ onConflictFields: ["user", "purpose"] }),
    );
    const [message] = mailGateway.send.mock.calls[0] as unknown as [{ to: string; text: string }];
    expect(message.to).toBe("ola@example.com");
    const upserted = fake.upsert.mock.calls[0] as unknown as [unknown, { tokenHash: string }];
    expect(hashToken(tokenFromMail(message.text))).toBe(upserted[1].tokenHash);
  });

  it("adres już potwierdzony → nic nie wysyła i nie wydaje tokenu (odpowiedź jak przy wysyłce)", async () => {
    const { fake, service, mailGateway } = setup();
    fake.findOne.mockResolvedValue(storedUser({ emailVerifiedAt: new Date() }));

    await expect(service.resendVerification(ID)).resolves.toBeUndefined();
    expect(fake.upsert).not.toHaveBeenCalled();
    expect(mailGateway.send).not.toHaveBeenCalled();
  });

  it("konto usunięte w trakcie sesji → 401", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(null);

    await expect(service.resendVerification(ID)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("verify-resend:user — czwarta prośba w godzinie → 429 bez zapytania; inne konto przechodzi", async () => {
    const { fake, service } = setup();
    fake.findOne.mockResolvedValue(storedUser());
    for (let i = 0; i < 3; i += 1) {
      await service.resendVerification(ID);
    }
    fake.findOne.mockClear();

    await expect(service.resendVerification(ID)).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(fake.findOne).not.toHaveBeenCalled();
    await expect(service.resendVerification("inne-konto")).resolves.toBeUndefined();
  });

  it("błąd poczty → sukces i log bez adresata i tokenu", async () => {
    const { fake, service, mailGateway, logLines } = setup();
    fake.findOne.mockResolvedValue(storedUser());
    mailGateway.send.mockRejectedValue(new Error("SMTP niedostępny"));

    await expect(service.resendVerification(ID)).resolves.toBeUndefined();
    const logs = logLines.join("");
    expect(logs).toContain("Nie udało się wysłać linku weryfikacyjnego");
    expect(logs).not.toContain("ola@example.com");
  });
});

describe("AccountService.verifyEmail", () => {
  const RAW = "surowy-token-z-linku";

  function withConsumed(fake: ReturnType<typeof createFakeEntityManager>["fake"], userId: string | null) {
    const { qb, nativeQuery } = createFakeQueryBuilder();
    fake.createQueryBuilder.mockReturnValue(qb);
    fake.execute.mockResolvedValue(userId === null ? [] : [{ user_id: userId }]);
    return { qb, nativeQuery };
  }

  it("ważny token → ustawia email_verified_at, usuwa wszystkie tokeny konta i zwraca adres konta", async () => {
    const { fake, service } = setup();
    const { qb } = withConsumed(fake, ID);
    const user = storedUser();
    fake.findOne.mockResolvedValue(user);

    const result = await service.verifyEmail(RAW, IP);

    expect(qb.delete).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: hashToken(RAW), purpose: "email_verification" }));
    expect(fake.findOne).toHaveBeenCalledWith(User, { id: ID });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(fake.nativeDelete).toHaveBeenCalledWith(UserToken, { user: ID });
    expect(result).toEqual({ emailVerified: true, email: "ola@example.com" });
  });

  it("adres już potwierdzony (np. przez GitHub) → data bez zmian, tokeny i tak usunięte", async () => {
    const { fake, service } = setup();
    withConsumed(fake, ID);
    const verifiedAt = new Date("2026-10-01T00:00:00.000Z");
    const user = storedUser({ emailVerifiedAt: verifiedAt });
    fake.findOne.mockResolvedValue(user);

    await expect(service.verifyEmail(RAW, IP)).resolves.toEqual({ emailVerified: true, email: "ola@example.com" });
    expect(user.emailVerifiedAt).toBe(verifiedAt);
    expect(fake.flush).not.toHaveBeenCalled();
    expect(fake.nativeDelete).toHaveBeenCalledWith(UserToken, { user: ID });
  });

  it.each([
    ["zły, wygasły albo zużyty token (consume → null)", null, storedUser()],
    ["konto zniknęło po zużyciu tokenu", ID, null],
  ])("%s → ValidationError „Link jest nieważny albo wygasł”, bez zmian", async (_case, consumed, user) => {
    const { fake, service } = setup();
    withConsumed(fake, consumed);
    fake.findOne.mockResolvedValue(user);

    const error = await service.verifyEmail(RAW, IP).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ message: "Link jest nieważny albo wygasł", fieldErrors: undefined });
    expect(fake.flush).not.toHaveBeenCalled();
    expect(fake.nativeDelete).not.toHaveBeenCalled();
  });

  it("token-confirm:ip — 21. próba z jednego IP w 15 minut → 429 bez zapytania", async () => {
    const { fake, service } = setup();
    withConsumed(fake, null);
    for (let i = 0; i < 20; i += 1) {
      await expect(service.verifyEmail(RAW, IP)).rejects.toBeInstanceOf(ValidationError);
    }
    fake.execute.mockClear();

    await expect(service.verifyEmail(RAW, IP)).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(fake.execute).not.toHaveBeenCalled();
    await expect(service.verifyEmail(RAW, "203.0.113.99")).rejects.toBeInstanceOf(ValidationError);
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
    const service = new AccountService({ ...otherDependencies(em), em, passwordHasher: new PasswordHasher(), rateLimiter: new RateLimiter() });

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
