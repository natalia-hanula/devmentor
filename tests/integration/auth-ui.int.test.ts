import { initOrm, User, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor, TEST_EMAIL_PREFIX } from "./support/accounts";
import { createBrowser, waitForHydration, type Browser } from "./support/browser";
import { uniqueClientIp } from "./support/client-ip";

const baseUrl = inject("baseUrl");
const PASSWORD = "integracyjne-haslo-123";

/**
 * Strony kont w przeglądarce (agent-browser) na `next start`. Każdy test dostaje własną sesję przeglądarki
 * i własny `x-forwarded-for` (aplikacja ma `TRUST_PROXY=true`), więc liczniki limitera się nie sumują.
 */
describe("strony kont w przeglądarce: /register, /login, /account, „Brak dostępu”, „Sesja wygasła”", () => {
  let orm: MikroORM;
  let browser: Browser;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    browser = createBrowser();
    await browser.run("set", "headers", JSON.stringify(uniqueClientIp()));
  });

  afterEach(async () => {
    await browser.close();
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  async function setSessionCookie(user: User) {
    const [name, value] = (await sessionCookieFor(user)).split(/=(.*)/s);
    await browser.run("cookies", "set", name!, value!, "--url", baseUrl, "--httpOnly");
  }

  const path = async () => new URL(await browser.run("get", "url")).pathname;

  it("rejestracja z formularza → /account z e-mailem i rolą mentee; „Wyloguj” → /login z „Wylogowano”", async () => {
    const email = `${TEST_EMAIL_PREFIX}ui-rejestracja@example.com`;
    await browser.run("open", `${baseUrl}/register`);
    await waitForHydration(browser, "form");
    await browser.run("find", "label", "Wyświetlana nazwa", "fill", "Ola z testu");
    await browser.run("find", "label", "E-mail", "fill", email);
    await browser.run("find", "label", "Hasło", "fill", PASSWORD);
    await browser.run("find", "role", "button", "click", "--name", "Załóż konto");

    await browser.run("wait", "--text", email);
    expect(await path()).toBe("/account");
    const card = await browser.run("get", "text", "[data-slot=card]");
    expect(card).toContain("Ola z testu");
    expect(card).toContain("mentee");
    expect(card).toContain("niepotwierdzony");

    await browser.run("find", "role", "button", "click", "--name", "Wyloguj");
    await browser.run("wait", "--text", "Wylogowano");
    expect(await browser.run("get", "url")).toBe(`${baseUrl}/login?notice=logged_out`);

    // Ciasteczko usunięte: /account znowu wymaga logowania (proxy, bez komunikatu).
    await browser.run("open", `${baseUrl}/account`);
    await browser.run("wait", "--fn", "location.pathname === '/login'");
    expect(new URL(await browser.run("get", "url")).searchParams.get("next")).toBe("/account");
    expect(await browser.run("get", "text", "body")).not.toContain("Sesja wygasła");
  });

  it("złe hasło → „Nieprawidłowy e-mail lub hasło” i puste pole hasła; poprawne z next=/admin → /admin (operator)", async () => {
    await createAccount(orm.em.fork(), { email: "ui-operator@example.com", roles: ["operator"], password: PASSWORD });
    await browser.run("open", `${baseUrl}/login?next=%2Fadmin`);
    await waitForHydration(browser, "form");
    await browser.run("find", "label", "E-mail", "fill", `${TEST_EMAIL_PREFIX}ui-operator@example.com`);
    await browser.run("find", "label", "Hasło", "fill", "zle-haslo-12345");
    await browser.run("find", "role", "button", "click", "--name", "Zaloguj się");

    await browser.run("wait", "--text", "Nieprawidłowy e-mail lub hasło");
    expect(await browser.run("get", "value", "input[name=password]")).toBe("");
    expect(await browser.run("get", "value", "input[name=email]")).toBe(`${TEST_EMAIL_PREFIX}ui-operator@example.com`);

    await browser.run("find", "label", "Hasło", "fill", PASSWORD);
    await browser.run("find", "role", "button", "click", "--name", "Zaloguj się");
    await browser.run("wait", "--text", "Połączono");
    expect(await path()).toBe("/admin");

    // Zalogowana osoba na /login nie widzi formularza (L05): bez next → strona startowa operatora.
    await browser.run("open", `${baseUrl}/login`);
    await browser.run("wait", "--fn", "location.pathname === '/admin/invitations'");
    expect(await path()).toBe("/admin/invitations");
  });

  it("mentee na /admin → „Brak dostępu” z przyciskiem powrotu na /account; „Zaloguj się innym kontem” wylogowuje", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "ui-mentee@example.com", roles: ["mentee"] });
    await setSessionCookie(mentee);

    await browser.run("open", `${baseUrl}/admin`);
    await browser.run("wait", "--text", "Nie masz dostępu do tej strony");
    expect(await browser.run("get", "attr", "a[href='/account']", "href")).toBe("/account");
    expect(await browser.run("get", "text", "main")).toContain("Wróć do swojej strony startowej");

    await browser.run("find", "role", "button", "click", "--name", "Zaloguj się innym kontem");
    await browser.run("wait", "--text", "Wylogowano");
    expect(await path()).toBe("/login");
  });

  it("ciasteczko z podbitym session_version → /login z „Sesja wygasła — zaloguj się ponownie”", async () => {
    const em = orm.em.fork();
    const mentee = await createAccount(em, { email: "ui-wygasla@example.com", roles: ["mentee", "operator"] });
    await setSessionCookie(mentee);
    mentee.sessionVersion += 1;
    await em.flush();

    await browser.run("open", `${baseUrl}/admin/technologies`);
    await browser.run("wait", "--text", "Sesja wygasła — zaloguj się ponownie");
    const url = new URL(await browser.run("get", "url"));
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/admin/technologies");
    expect(url.searchParams.get("notice")).toBe("session_expired");
  });
});
