import { initOrm, MentorInvitation, type MikroORM } from "@devmentor/db";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor, TEST_EMAIL_PREFIX } from "./support/accounts";
import { createBrowser, waitForHydration, type Browser } from "./support/browser";
import { uniqueClientIp } from "./support/client-ip";

const baseUrl = inject("baseUrl");

describe("/admin/invitations w przeglądarce (agent-browser)", () => {
  let browser: Browser;
  let orm: MikroORM;
  const email = `${TEST_EMAIL_PREFIX}ui-zaproszony-${Date.now()}@example.com`;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
    browser = createBrowser();
    await browser.run("set", "headers", JSON.stringify(uniqueClientIp()));
    const operator = await createAccount(orm.em.fork(), { email: "zaproszenia-ui@example.com", roles: ["operator"] });
    const [name, value] = (await sessionCookieFor(operator)).split(/=(.*)/s);
    await browser.run("cookies", "set", name!, value!, "--url", baseUrl, "--httpOnly");
  });

  afterAll(async () => {
    await browser.close();
    if (orm) {
      await deleteTestAccounts(orm.em.fork());
      await orm.close(true);
    }
  });

  it("tytuł, nawigacja i formularz: zaproszenie → jednorazowy panel z linkiem → tabela z „Oczekuje”", async () => {
    await browser.run("open", `${baseUrl}/admin/invitations`);
    await browser.run("wait", "--text", "Brak zaproszeń");
    expect(await browser.run("get", "text", "h1")).toBe("Zaproszenia");
    expect(Number(await browser.run("get", "count", "nav a[href='/admin/invitations']"))).toBe(1);
    await waitForHydration(browser, "main button");

    await browser.run("find", "role", "button", "click", "--name", "Zaproś mentora");
    await browser.run("find", "label", "E-mail zapraszanej osoby", "fill", email);
    await browser.run("find", "role", "button", "click", "--name", "Utwórz zaproszenie");
    await browser.run("wait", "--text", "Link widzisz tylko teraz.");

    const panel = await browser.run("get", "text", "[role=region]");
    expect(panel).toContain(`Zaproszenie dla ${email}`);
    expect(panel).toMatch(new RegExp(`${baseUrl}/invite#token=[\\w-]{43}`));
    await browser.run("wait", "--text", "Oczekuje");
    expect(await browser.run("get", "text", "tbody tr:first-child")).toContain(email);
    // Token jest tylko w panelu — nie w tabeli i nie w adresie strony.
    expect(await browser.run("get", "text", "tbody")).not.toContain("token=");
    expect(await browser.run("get", "url")).toBe(`${baseUrl}/admin/invitations`);
  });

  it("„Cofnij” zmienia status na „Cofnięte”, a przycisk znika", async () => {
    await browser.run("open", `${baseUrl}/admin/invitations`);
    await browser.run("wait", "--text", "Oczekuje");
    await waitForHydration(browser, "main button");

    await browser.run("find", "role", "button", "click", "--name", "Cofnij");
    await browser.run("wait", "--text", "Cofnięte");

    expect(await browser.run("get", "text", "tbody tr:first-child")).not.toContain("Oczekuje");
    expect(Number(await browser.run("get", "count", "tbody tr button"))).toBe(0);
    const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { email });
    expect(stored.revokedAt).toBeInstanceOf(Date);
  });
});
