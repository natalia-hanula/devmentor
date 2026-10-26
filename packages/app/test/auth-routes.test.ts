// @vitest-environment node
// jose podpisuje tokeny tylko na `Uint8Array` z realmu Node — w jsdom `TextEncoder` daje obcy typ.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountService,
  ConflictError,
  createLogger,
  RateLimiter,
  SessionTokenService,
  UserTokenService,
  ValidationError,
  type PasswordHasher,
  type RequestCradle,
} from "@devmentor/core";

const ACCOUNT = {
  id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b",
  email: "ola@example.com",
  displayName: "Ola",
  roles: ["mentee"],
  emailVerified: false,
  hasPassword: true,
};
const SESSION = { id: ACCOUNT.id, sessionVersion: 1 };
const PASSWORD = "Sekretne-Haslo-Testowe-123";

type ServiceMethod = "register" | "login" | "me" | "resendVerification" | "verifyEmail";

function freshService(): Pick<AccountService, ServiceMethod> {
  const service = { register: vi.fn(), login: vi.fn(), me: vi.fn(), resendVerification: vi.fn(), verifyEmail: vi.fn() };
  return service as unknown as Pick<AccountService, ServiceMethod>;
}

const cradle: {
  env: { TRUST_PROXY: boolean };
  sessionTokenService: SessionTokenService;
  accountService: Pick<AccountService, ServiceMethod>;
} = {
  env: { TRUST_PROXY: true },
  // `production` — ciasteczko z flagą Secure, jak na wdrożeniu.
  sessionTokenService: new SessionTokenService({ env: { AUTH_JWT_SECRET: "s".repeat(32), APP_ENV: "production" } }),
  accountService: freshService(),
};

const logLines = vi.hoisted((): string[] => []);
vi.mock("../../core/src/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/src/logger")>();
  const logger = actual.createLogger({ level: "trace", destination: { write: (line: string) => logLines.push(line) } });
  return { ...actual, getLogger: () => logger };
});

vi.mock("../../core/src/container/container", () => ({
  withScope: (work: (c: typeof cradle) => Promise<unknown>) => work(cradle),
}));

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../../core/src/http/session", () => ({ getSession }));

const register = await import("../app/api/auth/register/route");
const login = await import("../app/api/auth/login/route");
const logout = await import("../app/api/auth/logout/route");
const me = await import("../app/api/auth/me/route");
const resend = await import("../app/api/auth/email-verification/resend/route");
const confirm = await import("../app/api/auth/email-verification/confirm/route");

const context = { params: Promise.resolve({}) };

function post(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "x-devmentor-request": "1", "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function mocks() {
  return cradle.accountService as Record<ServiceMethod, ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  cradle.env.TRUST_PROXY = true;
  cradle.accountService = freshService();
  getSession.mockReset();
  getSession.mockResolvedValue(null);
  logLines.length = 0;
});

function expectSessionCookie(response: Response) {
  const [cookie, ...rest] = response.headers.getSetCookie();
  expect(rest).toEqual([]);
  expect(cookie).toMatch(/^devmentor_session=[\w-]+\.[\w-]+\.[\w-]+; /);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Max-Age=86400");
  expect(cookie).toContain("Secure");
  return cookie!;
}

describe("POST /api/auth/register", () => {
  const VALID = { email: " Ola@Example.com ", password: PASSWORD, displayName: " Ola " };

  it("bez nagłówka CSRF → 403, serwis nie jest wołany", async () => {
    const response = await register.POST(
      new Request("http://localhost/api/auth/register", { method: "POST", body: JSON.stringify(VALID) }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks().register).not.toHaveBeenCalled();
  });

  it("niepoprawne dane → 400 z fieldErrors przy polach", async () => {
    const response = await register.POST(post("/api/auth/register", { email: "zly", password: "krotkie", displayName: "" }), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fieldErrors).sort()).toEqual(["displayName", "email", "password"]);
    expect(mocks().register).not.toHaveBeenCalled();
  });

  it("201 z AccountDto i ciasteczkiem sesji; do serwisu trafia tylko sparsowany kształt i IP z zaufanego proxy", async () => {
    mocks().register.mockResolvedValue({ account: ACCOUNT, session: SESSION });

    const response = await register.POST(
      post("/api/auth/register", { ...VALID, roles: ["operator"], emailVerified: true }, { "x-forwarded-for": "198.51.100.1, 203.0.113.5" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, data: ACCOUNT });
    expect(mocks().register).toHaveBeenCalledWith(
      { email: "ola@example.com", password: PASSWORD, displayName: "Ola" },
      "203.0.113.5",
    );
    const cookie = expectSessionCookie(response);
    const token = cookie.slice("devmentor_session=".length, cookie.indexOf(";"));
    expect(await cradle.sessionTokenService.verify(token)).toEqual({ userId: ACCOUNT.id, sessionVersion: 1 });
    expect(JSON.stringify(body)).not.toContain(PASSWORD);
    expect(logLines.join("")).not.toContain(PASSWORD);
  });

  it("bez zaufanego proxy x-forwarded-for jest ignorowany — klucz „unknown”", async () => {
    cradle.env.TRUST_PROXY = false;
    mocks().register.mockResolvedValue({ account: ACCOUNT, session: SESSION });

    await register.POST(post("/api/auth/register", VALID, { "x-forwarded-for": "203.0.113.5" }), context);

    expect(mocks().register).toHaveBeenCalledWith(expect.any(Object), "unknown");
  });

  it("zajęty e-mail → 409 z błędem przy polu email, bez ciasteczka", async () => {
    mocks().register.mockRejectedValue(new ConflictError("Ten e-mail ma już konto", { email: ["Ten e-mail ma już konto"] }));

    const response = await register.POST(post("/api/auth/register", VALID), context);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toEqual({
      code: "CONFLICT",
      message: "Ten e-mail ma już konto",
      fieldErrors: { email: ["Ten e-mail ma już konto"] },
    });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("nieoczekiwany błąd → 500; log ma trasę, ale nie hasło ani e-mail", async () => {
    mocks().register.mockRejectedValue(new Error("awaria"));

    const response = await register.POST(post("/api/auth/register", VALID), context);

    expect(response.status).toBe(500);
    const logs = logLines.join("");
    expect(logs).toContain("POST /api/auth/register");
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain("ola@example.com");
  });
});

describe("POST /api/auth/login", () => {
  const VALID = { email: "Ola@Example.com", password: PASSWORD };

  it("bez nagłówka CSRF → 403", async () => {
    const response = await login.POST(
      new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify(VALID) }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks().login).not.toHaveBeenCalled();
  });

  it("puste pola → 400 z fieldErrors", async () => {
    const response = await login.POST(post("/api/auth/login", { email: "", password: "" }), context);

    expect(response.status).toBe(400);
    expect((await response.json()).error.fieldErrors).toEqual({ email: ["Podaj adres e-mail"], password: ["Podaj hasło"] });
  });

  it("200 z AccountDto i ciasteczkiem sesji", async () => {
    mocks().login.mockResolvedValue({ account: ACCOUNT, session: SESSION });

    const response = await login.POST(post("/api/auth/login", VALID, { "x-forwarded-for": "203.0.113.9" }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: ACCOUNT });
    expect(mocks().login).toHaveBeenCalledWith({ email: "ola@example.com", password: PASSWORD }, "203.0.113.9");
    expectSessionCookie(response);
  });

  it("prawdziwy AccountService: ogólny 401 dla nieznanego konta, a szósta próba z tego IP → 429; hasło nie w logach", async () => {
    const em = { findOne: vi.fn(async () => null) } as unknown as RequestCradle["em"];
    const passwordHasher = { verify: vi.fn(async () => false) } as unknown as PasswordHasher;
    cradle.accountService = new AccountService({
      em,
      passwordHasher,
      rateLimiter: new RateLimiter(),
      userTokenService: new UserTokenService({ em }),
      mailGateway: { send: vi.fn() },
      logger: createLogger({ level: "silent" }),
      env: { APP_BASE_URL: "http://localhost:3000" },
    });
    const attempt = () => login.POST(post("/api/auth/login", VALID, { "x-forwarded-for": "203.0.113.20" }), context);

    for (let i = 0; i < 5; i += 1) {
      const response = await attempt();
      expect(response.status).toBe(401);
      expect((await response.json()).error).toEqual({ code: "UNAUTHORIZED", message: "Nieprawidłowy e-mail lub hasło" });
    }
    const limited = await attempt();

    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("TOO_MANY_REQUESTS");
    expect(limited.headers.getSetCookie()).toEqual([]);
    expect(passwordHasher.verify).toHaveBeenCalledTimes(5);
    expect(logLines.join("")).not.toContain(PASSWORD);
  });
});

describe("POST /api/auth/logout", () => {
  it("bez nagłówka CSRF → 403", async () => {
    const response = await logout.POST(new Request("http://localhost/api/auth/logout", { method: "POST" }), context);

    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("czyści ciasteczko sesji — także bez sesji (idempotentne)", async () => {
    for (let i = 0; i < 2; i += 1) {
      const response = await logout.POST(post("/api/auth/logout"), context);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: null });
      expect(response.headers.getSetCookie()).toEqual([
        "devmentor_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
      ]);
    }
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/me", () => {
  it("bez sesji → 401", async () => {
    const response = await me.GET(new Request("http://localhost/api/auth/me"), context);

    expect(response.status).toBe(401);
    expect(mocks().me).not.toHaveBeenCalled();
  });

  it("z sesją → 200 z własnym kontem (id z sesji, nie z żądania)", async () => {
    getSession.mockResolvedValue({ userId: ACCOUNT.id, roles: ["mentee"], emailVerified: false });
    mocks().me.mockResolvedValue(ACCOUNT);

    const response = await me.GET(new Request(`http://localhost/api/auth/me?userId=inne-konto`), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: ACCOUNT });
    expect(mocks().me).toHaveBeenCalledWith(ACCOUNT.id);
  });
});

describe("POST /api/auth/email-verification/resend", () => {
  it("bez nagłówka CSRF → 403, serwis nie jest wołany", async () => {
    getSession.mockResolvedValue({ userId: ACCOUNT.id, roles: ["mentee"], emailVerified: false });

    const response = await resend.POST(
      new Request("http://localhost/api/auth/email-verification/resend", { method: "POST" }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks().resendVerification).not.toHaveBeenCalled();
  });

  it("bez sesji → 401", async () => {
    const response = await resend.POST(post("/api/auth/email-verification/resend"), context);

    expect(response.status).toBe(401);
    expect(mocks().resendVerification).not.toHaveBeenCalled();
  });

  it("z sesją → 200 z data: null; konto z sesji, nie z żądania", async () => {
    getSession.mockResolvedValue({ userId: ACCOUNT.id, roles: ["mentee"], emailVerified: false });
    mocks().resendVerification.mockResolvedValue(undefined);

    const response = await resend.POST(post("/api/auth/email-verification/resend", { userId: "inne-konto" }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: null });
    expect(mocks().resendVerification).toHaveBeenCalledWith(ACCOUNT.id);
  });

  it("prawdziwy AccountService: czwarta prośba w godzinie → 429", async () => {
    getSession.mockResolvedValue({ userId: ACCOUNT.id, roles: ["mentee"], emailVerified: true });
    const em = { findOne: vi.fn(async () => ({ id: ACCOUNT.id, email: ACCOUNT.email, emailVerifiedAt: new Date() })) };
    cradle.accountService = new AccountService({
      em: em as unknown as RequestCradle["em"],
      passwordHasher: {} as PasswordHasher,
      rateLimiter: new RateLimiter(),
      userTokenService: new UserTokenService({ em: em as unknown as RequestCradle["em"] }),
      mailGateway: { send: vi.fn() },
      logger: createLogger({ level: "silent" }),
      env: { APP_BASE_URL: "http://localhost:3000" },
    });

    for (let i = 0; i < 3; i += 1) {
      expect((await resend.POST(post("/api/auth/email-verification/resend"), context)).status).toBe(200);
    }
    const limited = await resend.POST(post("/api/auth/email-verification/resend"), context);

    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("TOO_MANY_REQUESTS");
  });
});

describe("POST /api/auth/email-verification/confirm", () => {
  const TOKEN = "surowy-token-z-linku-1234567890";

  it("bez nagłówka CSRF → 403", async () => {
    const response = await confirm.POST(
      new Request("http://localhost/api/auth/email-verification/confirm", { method: "POST", body: JSON.stringify({ token: TOKEN }) }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks().verifyEmail).not.toHaveBeenCalled();
  });

  it("pusty token → 400 przy polu token, serwis nie jest wołany", async () => {
    const response = await confirm.POST(post("/api/auth/email-verification/confirm", { token: "" }), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.fieldErrors).toEqual({ token: ["Link jest nieważny albo wygasł"] });
    expect(mocks().verifyEmail).not.toHaveBeenCalled();
  });

  it("publiczna: 200 { emailVerified, email } bez sesji; IP z zaufanego proxy; sesja nie jest czytana ani zmieniana", async () => {
    mocks().verifyEmail.mockResolvedValue({ emailVerified: true, email: "b@example.com" });

    const response = await confirm.POST(
      post("/api/auth/email-verification/confirm", { token: TOKEN }, { "x-forwarded-for": "203.0.113.30" }),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { emailVerified: true, email: "b@example.com" } });
    expect(mocks().verifyEmail).toHaveBeenCalledWith(TOKEN, "203.0.113.30");
    expect(getSession).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("nieważny link → 400 „Link jest nieważny albo wygasł”", async () => {
    mocks().verifyEmail.mockRejectedValue(new ValidationError("Link jest nieważny albo wygasł"));

    const response = await confirm.POST(post("/api/auth/email-verification/confirm", { token: TOKEN }), context);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual({ code: "VALIDATION_ERROR", message: "Link jest nieważny albo wygasł" });
  });

  it("prawdziwy AccountService: 21. próba z jednego IP → 429", async () => {
    const em = { createQueryBuilder: vi.fn(), execute: vi.fn(async () => []) };
    const nativeQuery = { returning: vi.fn(() => nativeQuery) };
    const qb = { delete: vi.fn(() => qb), getNativeQuery: vi.fn(() => nativeQuery) };
    em.createQueryBuilder.mockReturnValue(qb);
    cradle.accountService = new AccountService({
      em: em as unknown as RequestCradle["em"],
      passwordHasher: {} as PasswordHasher,
      rateLimiter: new RateLimiter(),
      userTokenService: new UserTokenService({ em: em as unknown as RequestCradle["em"] }),
      mailGateway: { send: vi.fn() },
      logger: createLogger({ level: "silent" }),
      env: { APP_BASE_URL: "http://localhost:3000" },
    });
    const attempt = () =>
      confirm.POST(post("/api/auth/email-verification/confirm", { token: TOKEN }, { "x-forwarded-for": "203.0.113.31" }), context);

    for (let i = 0; i < 20; i += 1) {
      expect((await attempt()).status).toBe(400);
    }
    const limited = await attempt();

    expect(limited.status).toBe(429);
  });

  it("nieoczekiwany błąd → 500; log ma tylko ścieżkę, bez tokenu", async () => {
    mocks().verifyEmail.mockRejectedValue(new Error("awaria"));

    const response = await confirm.POST(post("/api/auth/email-verification/confirm", { token: TOKEN }), context);

    expect(response.status).toBe(500);
    const logs = logLines.join("");
    expect(logs).toContain("POST /api/auth/email-verification/confirm");
    expect(logs).not.toContain(TOKEN);
  });
});
