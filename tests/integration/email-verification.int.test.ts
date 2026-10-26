import { initOrm, User, UserToken, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor, TEST_EMAIL_PREFIX } from "./support/accounts";
import { createBrowser, waitForHydration, type Browser } from "./support/browser";
import { uniqueClientIp } from "./support/client-ip";

const PASSWORD = "integracyjne-haslo-123";
const INVALID_LINK = { code: "VALIDATION_ERROR", message: "Link jest nieważny albo wygasł" };

interface Envelope<T = Record<string, unknown>> {
  ok: boolean;
  data: T;
  error: { code: string; message: string };
}

interface OutboxMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Weryfikacja e-maila na `next start` i prawdziwej bazie: rejestracja wysyła link do skrzynki (outbox),
 * operator czyta ją przez `/api/mail/outbox`, a token z fragmentu linku idzie do `confirm`.
 */
describe("weryfikacja e-maila: link z outboxa, confirm, resend, /verify-email", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;
  let operatorCookie: string;
  let counter = 0;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    const operator = await createAccount(orm.em.fork(), { email: "weryfikacja-operator@example.com", roles: ["operator"] });
    operatorCookie = await sessionCookieFor(operator);
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  function uniqueEmail(): string {
    counter += 1;
    return `${TEST_EMAIL_PREFIX}weryfikacja-${counter}-${Date.now()}@example.com`;
  }

  function post(path: string, body?: unknown, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp(), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Rejestracja przez API; zwraca ciasteczko sesji nowego konta. */
  async function register(email: string): Promise<string> {
    const response = await post("/api/auth/register", { email, password: PASSWORD, displayName: "Konto testowe" });
    expect(response.status).toBe(201);
    return response.headers.getSetCookie()[0]!.split(";")[0]!;
  }

  /** Linki weryfikacyjne do adresu w kolejności od najnowszego (operator czyta skrzynkę). */
  async function verificationLinks(email: string): Promise<URL[]> {
    const response = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
    const body = (await response.json()) as Envelope<OutboxMessage[]>;
    expect(body.ok).toBe(true);
    return body.data
      .filter((message) => message.to === email)
      .map((message) => {
        expect(message.subject).toBe("Potwierdź adres e-mail");
        const link = /https?:\/\/\S+/.exec(message.text)?.[0];
        expect(link).toBeDefined();
        return new URL(link!);
      });
  }

  function tokenOf(link: URL): string {
    expect(link.search).toBe("");
    const token = new URLSearchParams(link.hash.slice(1)).get("token");
    expect(token).toBeTruthy();
    return token!;
  }

  const confirm = (token: string) => post("/api/auth/email-verification/confirm", { token });
  const getMe = (cookie: string) => fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });

  it("rejestracja → link z outboxa (token we fragmencie) → confirm → me.emailVerified; drugie użycie → 400", async () => {
    const email = uniqueEmail();
    const cookie = await register(email);
    const [link] = await verificationLinks(email);
    expect(link!.origin).toBe(baseUrl);
    expect(link!.pathname).toBe("/verify-email");

    const confirmed = await confirm(tokenOf(link!));
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toEqual({ ok: true, data: { emailVerified: true, email } });
    expect(((await (await getMe(cookie)).json()) as Envelope).data.emailVerified).toBe(true);
    const tokens = await orm.em.fork().count(UserToken, { user: { email } });
    expect(tokens).toBe(0);

    const again = await confirm(tokenOf(link!));
    expect(again.status).toBe(400);
    expect(((await again.json()) as Envelope).error).toEqual(INVALID_LINK);
  });

  it("resend wysyła nowy link i unieważnia poprzedni; bez sesji 401, bez CSRF 403", async () => {
    const email = uniqueEmail();
    const cookie = await register(email);
    const [first] = await verificationLinks(email);

    expect((await post("/api/auth/email-verification/resend")).status).toBe(401);
    const withoutCsrf = await fetch(`${baseUrl}/api/auth/email-verification/resend`, { method: "POST", headers: { cookie } });
    expect(withoutCsrf.status).toBe(403);

    const resent = await post("/api/auth/email-verification/resend", undefined, { cookie });
    expect(resent.status).toBe(200);
    const [second] = await verificationLinks(email);
    expect(tokenOf(second!)).not.toBe(tokenOf(first!));

    expect((await confirm(tokenOf(first!))).status).toBe(400);
    expect((await confirm(tokenOf(second!))).status).toBe(200);
  });

  it("resend po potwierdzeniu → 200 bez nowej wiadomości; czwarta prośba w godzinie → 429", async () => {
    const email = uniqueEmail();
    const cookie = await register(email);
    const [link] = await verificationLinks(email);
    expect((await confirm(tokenOf(link!))).status).toBe(200);

    expect((await post("/api/auth/email-verification/resend", undefined, { cookie })).status).toBe(200);
    expect(await verificationLinks(email)).toHaveLength(1);

    expect((await post("/api/auth/email-verification/resend", undefined, { cookie })).status).toBe(200);
    expect((await post("/api/auth/email-verification/resend", undefined, { cookie })).status).toBe(200);
    const limited = await post("/api/auth/email-verification/resend", undefined, { cookie });
    expect(limited.status).toBe(429);
  });

  it("token konta B przy zalogowanym A → sukces z adresem B, sesja A bez zmian", async () => {
    const emailA = uniqueEmail();
    const emailB = uniqueEmail();
    const cookieA = await register(emailA);
    await register(emailB);
    const [linkB] = await verificationLinks(emailB);

    const confirmed = await post("/api/auth/email-verification/confirm", { token: tokenOf(linkB!) }, { cookie: cookieA });

    expect(confirmed.status).toBe(200);
    expect(confirmed.headers.getSetCookie()).toEqual([]);
    expect(((await confirmed.json()) as Envelope).data).toEqual({ emailVerified: true, email: emailB });
    const meA = (await (await getMe(cookieA)).json()) as Envelope;
    expect(meA.data).toMatchObject({ email: emailA, emailVerified: false });
    const userB = await orm.em.fork().findOneOrFail(User, { email: emailB });
    expect(userB.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("21. próba potwierdzenia z jednego IP w 15 minut → 429", async () => {
    const ip = uniqueClientIp();
    for (let i = 0; i < 20; i += 1) {
      const response = await post("/api/auth/email-verification/confirm", { token: `zly-token-${i}` }, ip);
      expect(response.status).toBe(400);
    }
    const limited = await post("/api/auth/email-verification/confirm", { token: "zly-token" }, ip);
    expect(limited.status).toBe(429);
  });

  describe("w przeglądarce (agent-browser)", () => {
    let browser: Browser;

    beforeEach(async () => {
      browser = createBrowser();
      await browser.run("set", "headers", JSON.stringify(uniqueClientIp()));
    });

    afterEach(async () => {
      await browser.close();
    });

    it("rejestracja → baner na /account → link z outboxa → „Przejdź do konta” → status „potwierdzony”, bez banera", async () => {
      const email = uniqueEmail();
      await browser.run("open", `${baseUrl}/register`);
      await waitForHydration(browser, "form");
      await browser.run("find", "label", "Wyświetlana nazwa", "fill", "Ola z testu");
      await browser.run("find", "label", "E-mail", "fill", email);
      await browser.run("find", "label", "Hasło", "fill", PASSWORD);
      await browser.run("find", "role", "button", "click", "--name", "Załóż konto");
      await browser.run("wait", "--text", "Potwierdź adres e-mail — będzie potrzebny przed pierwszą rezerwacją");
      expect(await browser.run("get", "text", "[data-slot=card]")).toContain("niepotwierdzony");

      const [link] = await verificationLinks(email);
      await browser.run("open", link!.toString());
      await browser.run("wait", "--text", "Adres e-mail potwierdzony");
      // Fragment z tokenem zniknął z paska adresu (replaceState), łącznie ze znakiem „#”.
      await browser.run("wait", "--fn", "location.hash === '' && !location.href.includes('#')");
      expect(await browser.run("get", "url")).toBe(`${baseUrl}/verify-email`);

      await browser.run("find", "role", "link", "click", "--name", "Przejdź do konta");
      await browser.run("wait", "--fn", "location.pathname === '/account'");
      await browser.run("wait", "--text", email);
      const card = await browser.run("get", "text", "[data-slot=card]");
      expect(card).toContain("potwierdzony");
      expect(card).not.toContain("niepotwierdzony");
      expect(card).not.toContain("Potwierdź adres e-mail");

      // Ten sam link drugi raz: zużyty, a adres już potwierdzony → „Przejdź do konta” (OP-1).
      await browser.run("open", link!.toString());
      await browser.run("wait", "--text", "Link jest nieważny albo wygasł");
      expect(await browser.run("get", "text", "[data-slot=card]")).toContain("Przejdź do konta");
    });

    it("gość: unieważniony link → logowanie z next=/account; aktualny link → sukces i „Zaloguj się”", async () => {
      const email = uniqueEmail();
      const cookie = await register(email);
      await post("/api/auth/email-verification/resend", undefined, { cookie });
      const [newest, older] = await verificationLinks(email);

      await browser.run("open", older!.toString());
      await browser.run("wait", "--text", "Link jest nieważny albo wygasł");
      expect(await browser.run("get", "attr", "a[href^='/login']", "href")).toBe("/login?next=%2Faccount");

      // Inna strona pomiędzy: link różniący się tylko fragmentem byłby nawigacją w tym samym dokumencie.
      await browser.run("open", "about:blank");
      await browser.run("open", newest!.toString());
      await browser.run("wait", "--text", "Adres e-mail potwierdzony");
      expect(await browser.run("get", "attr", "a[href='/login']", "href")).toBe("/login");
    });
  });
});
