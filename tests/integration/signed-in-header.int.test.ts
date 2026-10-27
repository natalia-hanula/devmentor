import { randomUUID } from "node:crypto";
import { initOrm, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor } from "./support/accounts";
import { createBrowser, waitForHydration, type Browser } from "./support/browser";
import { uniqueClientIp } from "./support/client-ip";

const baseUrl = inject("baseUrl");

/** Nagłówek zalogowanego (e01, L21) na prawdziwej aplikacji w przeglądarce. */
describe("nagłówek zalogowanego na /account, /mentor i /admin/* (agent-browser)", () => {
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
  });

  afterAll(async () => {
    await deleteTestAccounts(orm.em.fork());
    await orm.close(true);
  });

  async function signIn(roles: ("mentee" | "mentor" | "operator")[], displayName: string) {
    const user = await createAccount(orm.em.fork(), { email: `naglowek-${randomUUID()}@example.com`, roles, displayName });
    const cookie = await sessionCookieFor(user);
    const [name, value] = cookie.split(/=(.*)/s);
    await browser.run("cookies", "set", name!, value!, "--url", baseUrl, "--httpOnly");
    return { user, cookie };
  }

  const headerLinks = async () => (await browser.run("get", "text", "nav[aria-label='Konto']")).split(/\s+/).join(" ");

  it("mentee na /account: nazwa, „Konto” i „Wyloguj”; bez linków do paneli; bezpośrednie wejście do panelu operatora → „Brak dostępu” i 403 z API", async () => {
    const { cookie } = await signIn(["mentee"], "Mentee z nagłówka");

    await browser.run("open", `${baseUrl}/account`);
    await browser.run("wait", "--text", "Mentee z nagłówka");

    expect(await headerLinks()).toBe("Konto");
    expect(await browser.run("get", "text", "header")).toContain("Wyloguj");
    expect(Number(await browser.run("get", "count", "a[href='/admin/invitations']"))).toBe(0);
    expect(Number(await browser.run("get", "count", "a[href='/mentor']"))).toBe(0);

    await browser.run("open", `${baseUrl}/admin/invitations`);
    await browser.run("wait", "--text", "Ta strona wymaga roli operatora.");
    expect(await browser.run("get", "text", "[role=alert]")).toContain("Nie masz dostępu do tej strony");
    const api = await fetch(`${baseUrl}/api/auth/invitations`, { headers: { cookie } });
    expect(api.status).toBe(403);
  });

  it("mentor na /mentor: „Konto” i „Panel mentora” (aktywny), bez panelu operatora", async () => {
    await signIn(["mentee", "mentor"], "Mentor z nagłówka");

    await browser.run("open", `${baseUrl}/mentor`);
    await browser.run("wait", "--text", "Mentor z nagłówka");

    expect(await headerLinks()).toBe("Konto Panel mentora");
    expect(await browser.run("get", "attr", "a[href='/mentor']", "aria-current")).toBe("page");
    expect(Number(await browser.run("get", "count", "a[href='/admin/invitations']"))).toBe(0);
  });

  it("operator na /admin/outbox: „Panel operatora” aktywny, nawigacja panelu z aktywną „Skrzynką”, „Wyloguj” → /login z „Wylogowano”", async () => {
    await signIn(["operator"], "Operator z nagłówka");

    await browser.run("open", `${baseUrl}/admin/outbox`);
    await browser.run("wait", "--text", "Operator z nagłówka");

    expect(await headerLinks()).toBe("Konto Panel operatora");
    expect(await browser.run("get", "attr", "a[href='/admin/invitations'][aria-current]", "aria-current").catch(() => "")).toBe("page");
    expect(await browser.run("get", "attr", "nav[aria-label='Panel operatora'] a[aria-current]", "href")).toBe("/admin/outbox");
    expect(Number(await browser.run("get", "count", "a[href='/mentor']"))).toBe(0);

    await waitForHydration(browser, "header button");
    await browser.run("find", "role", "button", "click", "--name", "Wyloguj");
    await browser.run("wait", "--text", "Wylogowano");
    expect(await browser.run("get", "url")).toBe(`${baseUrl}/login?notice=logged_out`);
  });
});
