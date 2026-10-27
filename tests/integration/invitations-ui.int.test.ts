import { initOrm, MentorInvitation, User, UserRole, type MikroORM } from "@devmentor/db";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAccount, createOperatorAndLogIn, deleteTestAccounts, sessionCookieFor, TEST_EMAIL_PREFIX } from "./support/accounts";
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
    expect(Number(await browser.run("get", "count", "nav[aria-label='Panel operatora'] a[href='/admin/invitations']"))).toBe(1);
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

  it("„Odbierz rolę mentora”: potwierdzenie w wierszu, potem „rola mentora odebrana” i brak przycisku", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "odbierz-ui@example.com", roles: ["mentee"] });
    // Przyjęte zaproszenie zakładamy w bazie (samo przyjęcie przez API ma własne testy), żeby nie ruszać oczekującego z poprzedniego testu.
    const em = orm.em.fork();
    em.create(MentorInvitation, {
      email: `${TEST_EMAIL_PREFIX}ui-przyjete-${Date.now()}@example.com`,
      tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: null,
      revokedAt: null,
      acceptedAt: new Date(),
      acceptedBy: em.getReference(User, mentee.id),
    });
    em.create(UserRole, { user: em.getReference(User, mentee.id), role: "mentor" });
    await em.flush();

    await browser.run("open", `${baseUrl}/admin/invitations`);
    await browser.run("wait", "--text", "Przyjęte");
    await waitForHydration(browser, "[data-slot=table] button");
    await browser.run("find", "role", "button", "click", "--name", "Odbierz rolę mentora");
    await browser.run("wait", "--text", "Odebrać rolę mentora?");
    expect(await orm.em.fork().count(UserRole, { user: mentee.id, role: "mentor" })).toBe(1);

    await browser.run("find", "role", "button", "click", "--name", "Tak, odbierz");
    await browser.run("wait", "--text", "rola mentora odebrana");

    expect(await orm.em.fork().count(UserRole, { user: mentee.id, role: "mentor" })).toBe(0);
    expect(await browser.run("eval", "document.body.innerText.includes('Odbierz rolę mentora')")).toBe("false");
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

describe("/invite w przeglądarce (agent-browser)", () => {
  let orm: MikroORM;
  let browser: Browser;
  let operatorCookie: string;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
    operatorCookie = await createOperatorAndLogIn(orm.em.fork(), baseUrl, {
      email: `invite-ui-operator-${randomUUID()}@example.com`,
      password: "integracyjne-haslo-123",
    });
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

  async function newInviteLink(): Promise<string> {
    const email = `${TEST_EMAIL_PREFIX}ui-link-${randomUUID()}@example.com`;
    const response = await fetch(`${baseUrl}/api/auth/invitations`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", cookie: operatorCookie, ...uniqueClientIp() },
      body: JSON.stringify({ email }),
    });
    expect(response.status).toBe(201);
    return ((await response.json()) as { data: { link: string } }).data.link;
  }

  async function signIn(roles: ("mentee" | "operator")[]): Promise<string> {
    const user = await createAccount(orm.em.fork(), { email: `invite-ui-${randomUUID()}@example.com`, roles });
    const cookie = await sessionCookieFor(user);
    const [name, value] = cookie.split(/=(.*)/s);
    await browser.run("cookies", "set", name!, value!, "--url", baseUrl, "--httpOnly");
    return user.id;
  }

  it("gość: zdanie z zaproszeniem, token w sessionStorage i poza adresem, linki z next=/invite", async () => {
    const link = await newInviteLink();
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;

    await browser.run("open", link);
    await browser.run("wait", "--text", "Masz zaproszenie do roli mentora w DevMentor");

    await browser.run("wait", "--fn", "location.hash === '' && !location.href.includes('#')");
    expect(await browser.run("get", "url")).toBe(`${baseUrl}/invite`);
    expect(await browser.run("eval", "sessionStorage.getItem('devmentor.invite-token')")).toContain(token);
    expect(await browser.run("get", "attr", "a[href^='/login']", "href")).toBe("/login?next=%2Finvite");
    expect(await browser.run("get", "attr", "a[href^='/register']", "href")).toBe("/register?next=%2Finvite");
    expect(await browser.run("eval", "document.body.innerHTML")).not.toContain(token);
  });

  it("brak tokenu → „Link jest nieważny albo wygasł”", async () => {
    await browser.run("open", `${baseUrl}/invite`);
    await browser.run("wait", "--text", "Link jest nieważny albo wygasł");

    expect(await browser.run("get", "text", "[role=alert]")).toContain("Link jest nieważny albo wygasł");
  });

  it("zalogowane mentee: „Przyjmij zaproszenie” nadaje rolę mentora i prowadzi do /mentor; token wyczyszczony", async () => {
    const link = await newInviteLink();
    const userId = await signIn(["mentee"]);

    await browser.run("open", link);
    await waitForHydration(browser, "[data-slot=card] button");
    await browser.run("find", "role", "button", "click", "--name", "Przyjmij zaproszenie");
    await browser.run("wait", "--fn", "location.pathname === '/mentor'");

    expect(await orm.em.fork().count(UserRole, { user: userId, role: "mentor" })).toBe(1);
    expect(await browser.run("eval", "String(sessionStorage.getItem('devmentor.invite-token'))")).toContain("null");
  });

  it("zużyty link → „Zaproszenie jest nieważne” z podpowiedzią (L17)", async () => {
    const link = await newInviteLink();
    await signIn(["mentee"]);
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;
    await orm.em.fork().nativeUpdate(MentorInvitation, { acceptedAt: null, revokedAt: null, email: { $like: `${TEST_EMAIL_PREFIX}ui-link-%` } }, { revokedAt: new Date() });

    await browser.run("open", link);
    await waitForHydration(browser, "[data-slot=card] button");
    await browser.run("find", "role", "button", "click", "--name", "Przyjmij zaproszenie");
    await browser.run("wait", "--text", "Zaproszenie jest nieważne");

    const alert = await browser.run("get", "text", "[role=alert]");
    expect(alert).toContain("Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.");
    expect(await browser.run("eval", "String(sessionStorage.getItem('devmentor.invite-token'))")).toContain("null");
    expect(await browser.run("eval", "document.body.innerHTML")).not.toContain(token);
  });

  it("operator: „Brak dostępu” z dopiskiem, bez przycisku przyjęcia", async () => {
    const link = await newInviteLink();
    await signIn(["operator"]);

    await browser.run("open", link);
    await browser.run("wait", "--text", "Zaproszenia przyjmuje konto mentora, nie operatora.");

    expect(await browser.run("get", "text", "[role=alert]")).toContain("Nie masz dostępu do tej strony");
    expect(Number(await browser.run("get", "count", "button:has-text('Przyjmij zaproszenie')"))).toBe(0);
  });
});
