import { initOrm, User, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, TEST_EMAIL_PREFIX } from "./support/accounts";
import { uniqueClientIp } from "./support/client-ip";

const PASSWORD = "integracyjne-haslo-123";
interface Envelope {
  ok: boolean;
  data: { id: string; [key: string]: unknown };
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
}

/** Koperta API z odpowiedzi — kształt sprawdzają asercje. */
async function envelope(response: Response): Promise<Envelope> {
  return (await response.json()) as Envelope;
}

const INVALID_CREDENTIALS = { code: "UNAUTHORIZED", message: "Nieprawidłowy e-mail lub hasło" };

describe("konta: rejestracja, logowanie, wylogowanie i me na next start i prawdziwej bazie", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;
  let counter = 0;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  function uniqueEmail(): string {
    counter += 1;
    return `${TEST_EMAIL_PREFIX}konto-${counter}@example.com`;
  }

  function post(path: string, body: unknown, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", ...headers },
      body: JSON.stringify(body),
    });
  }

  const register = (email: string, headers = uniqueClientIp()) =>
    post("/api/auth/register", { email, password: PASSWORD, displayName: "Konto testowe" }, headers);
  const login = (email: string, password: string, headers: Record<string, string> = uniqueClientIp()) =>
    post("/api/auth/login", { email, password }, headers);
  const getMe = (cookie?: string) => fetch(`${baseUrl}/api/auth/me`, { headers: cookie ? { cookie } : {} });

  /** `nazwa=wartość` z pierwszego `Set-Cookie` — tak, jak przeglądarka odeśle je w kolejnym żądaniu. */
  function cookieFrom(response: Response): string {
    const [setCookie] = response.headers.getSetCookie();
    expect(setCookie).toBeDefined();
    return setCookie!.split(";")[0]!;
  }

  it("rejestracja → me z ciasteczka → wylogowanie → me 401; w bazie hash bcrypt i rola mentee", async () => {
    const email = uniqueEmail();

    const registered = await register(email);
    const body = await envelope(registered);
    expect(registered.status).toBe(201);
    expect(body).toEqual({
      ok: true,
      data: {
        id: expect.any(String),
        email,
        displayName: "Konto testowe",
        roles: ["mentee"],
        emailVerified: false,
        hasPassword: true,
      },
    });
    expect(JSON.stringify(body)).not.toContain(PASSWORD);
    const [setCookie] = registered.headers.getSetCookie();
    expect(setCookie).toMatch(/^devmentor_session=.+; Path=\/; Max-Age=86400; HttpOnly; SameSite=Lax$/);

    const cookie = cookieFrom(registered);
    const meResponse = await getMe(cookie);
    expect(meResponse.status).toBe(200);
    expect(await envelope(meResponse)).toEqual(body);

    const user = await orm.em.fork().findOneOrFail(User, { email }, { populate: ["roles"] });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user.roles.getItems().map((entry) => entry.role)).toEqual(["mentee"]);
    expect(user.emailVerifiedAt).toBeNull();

    const loggedOut = await post("/api/auth/logout", {}, { cookie });
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.headers.getSetCookie()).toEqual(["devmentor_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"]);
    expect((await getMe(cookieFrom(loggedOut))).status).toBe(401);
  });

  it("wylogowanie podbija session_version: skopiowany token przestaje działać (401), a nowe logowanie daje działający", async () => {
    const email = uniqueEmail();
    const cookie = cookieFrom(await register(email));
    const before = await orm.em.fork().findOneOrFail(User, { email });
    expect((await getMe(cookie)).status).toBe(200);

    expect((await post("/api/auth/logout", {}, { cookie })).status).toBe(200);

    const after = await orm.em.fork().findOneOrFail(User, { email });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect((await getMe(cookie)).status).toBe(401);
    const relogged = await login(email, PASSWORD);
    expect(relogged.status).toBe(200);
    expect((await getMe(cookieFrom(relogged))).status).toBe(200);
  });

  it("wylogowanie z nieważnym ciasteczkiem nie zmienia session_version żadnego konta", async () => {
    const email = uniqueEmail();
    const cookie = cookieFrom(await register(email));
    const before = await orm.em.fork().findOneOrFail(User, { email });

    expect((await post("/api/auth/logout", {}, { cookie: "devmentor_session=to-nie-jest-jwt" })).status).toBe(200);

    expect((await orm.em.fork().findOneOrFail(User, { email })).sessionVersion).toBe(before.sessionVersion);
    expect((await getMe(cookie)).status).toBe(200);
  });

  it("wylogowanie bez sesji i bez nagłówka CSRF: 200 idempotentnie, a bez nagłówka 403", async () => {
    expect((await post("/api/auth/logout", {})).status).toBe(200);
    expect((await post("/api/auth/logout", {})).status).toBe(200);
    const withoutMarker = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });
    expect(withoutMarker.status).toBe(403);
  });

  it("rejestracja i logowanie bez nagłówka CSRF → 403, konto nie powstaje", async () => {
    const email = uniqueEmail();
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", ...uniqueClientIp() },
      body: JSON.stringify({ email, password: PASSWORD, displayName: "X" }),
    });

    expect(response.status).toBe(403);
    expect(await orm.em.fork().count(User, { email })).toBe(0);
  });

  it("dwie równoczesne rejestracje tego samego e-maila → jedna 201, druga 409 przy polu email", async () => {
    const email = uniqueEmail();

    const responses = await Promise.all([register(email), register(email)]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409]);
    const conflict = responses.find((response) => response.status === 409)!;
    expect((await envelope(conflict)).error).toEqual({
      code: "CONFLICT",
      message: "Ten e-mail ma już konto",
      fieldErrors: { email: ["Ten e-mail ma już konto"] },
    });
    expect(conflict.headers.getSetCookie()).toEqual([]);
    expect(await orm.em.fork().count(User, { email })).toBe(1);
  });

  it("adres różniący się wielkością liter i spacjami to ten sam e-mail → 409", async () => {
    const email = uniqueEmail();
    expect((await register(email)).status).toBe(201);

    const response = await register(`  ${email.toUpperCase()} `);

    expect(response.status).toBe(409);
    expect((await envelope(response)).error.fieldErrors).toEqual({ email: ["Ten e-mail ma już konto"] });
  });

  it("logowanie: poprawne dane → 200 i działające ciasteczko; nieznany e-mail i złe hasło → ten sam 401", async () => {
    const email = uniqueEmail();
    expect((await register(email)).status).toBe(201);

    const ok = await login(` ${email.toUpperCase()}`, PASSWORD);
    expect(ok.status).toBe(200);
    const okBody = await envelope(ok);
    expect(okBody.data).toMatchObject({ email, roles: ["mentee"], hasPassword: true });
    expect((await getMe(cookieFrom(ok))).status).toBe(200);

    const wrongPassword = await login(email, "zle-haslo-ale-dlugie");
    const unknownEmail = await login(uniqueEmail(), PASSWORD);

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect((await envelope(wrongPassword)).error).toEqual(INVALID_CREDENTIALS);
    expect((await envelope(unknownEmail)).error).toEqual(INVALID_CREDENTIALS);
    expect(wrongPassword.headers.getSetCookie()).toEqual([]);
  });

  it("konto bez hasła (np. tylko z GitHubem) → ten sam ogólny 401 co złe hasło, bez ciasteczka", async () => {
    const account = await createAccount(orm.em.fork(), { email: `konto-bez-hasla-${Date.now()}@example.com`, roles: ["mentee"] });

    const response = await login(account.email, PASSWORD);

    expect(response.status).toBe(401);
    expect((await envelope(response)).error).toEqual(INVALID_CREDENTIALS);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("limiter logowania: szósta próba z jednego IP na ten sam e-mail → 429, nawet z poprawnym hasłem", async () => {
    const email = uniqueEmail();
    expect((await register(email)).status).toBe(201);
    const ip = uniqueClientIp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login(email, "zle-haslo-ale-dlugie", ip)).status).toBe(401);
    }
    const limited = await login(email, PASSWORD, ip);

    expect(limited.status).toBe(429);
    expect(await envelope(limited)).toEqual({
      ok: false,
      error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." },
    });
    expect(limited.headers.getSetCookie()).toEqual([]);
    // Inny adres klienta ma własny licznik.
    expect((await login(email, PASSWORD, uniqueClientIp())).status).toBe(200);
  });

  it("niezalogowany → 401 na chronionych trasach (me, skrzynka)", async () => {
    expect((await getMe()).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/mail/outbox`)).status).toBe(401);
  });

  it("mentee po rejestracji → 403 na skrzynce operatora; me zwraca wyłącznie własne konto", async () => {
    const first = await register(uniqueEmail());
    const second = await register(uniqueEmail());
    const firstBody = await envelope(first);
    const cookie = cookieFrom(first);

    const outbox = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie } });
    expect(outbox.status).toBe(403);

    const secondId = (await envelope(second)).data.id as string;
    const meResponse = await fetch(`${baseUrl}/api/auth/me?userId=${secondId}`, { headers: { cookie } });
    expect((await envelope(meResponse)).data.id).toBe(firstBody.data.id);
  });

  it("niepoprawne dane rejestracji → 400 z fieldErrors (hasło 12 znaków, ale > 72 bajty)", async () => {
    const response = await post(
      "/api/auth/register",
      { email: uniqueEmail(), password: "🔑".repeat(19), displayName: "Konto testowe" },
      uniqueClientIp(),
    );

    expect(response.status).toBe(400);
    expect(Object.keys((await envelope(response)).error.fieldErrors ?? {})).toEqual(["password"]);
  });

  it("logowanie: hasło dłuższe niż 72 bajty → 400 przy polu password (bez wołania bcrypt)", async () => {
    const response = await login(uniqueEmail(), "a".repeat(73));

    expect(response.status).toBe(400);
    expect((await envelope(response)).error.fieldErrors).toEqual({ password: ["Hasło jest za długie"] });
  });

  it.each(["/api/auth/login", "/api/auth/register"])("%s: body większe niż 16 KiB → 413 PAYLOAD_TOO_LARGE", async (path) => {
    const response = await post(path, { email: uniqueEmail(), password: "a".repeat(20 * 1024), displayName: "x" }, uniqueClientIp());

    expect(response.status).toBe(413);
    expect((await envelope(response)).error).toEqual({ code: "PAYLOAD_TOO_LARGE", message: "Treść żądania jest za duża" });
  });
});
