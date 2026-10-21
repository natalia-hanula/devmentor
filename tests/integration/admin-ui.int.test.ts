import { initOrm, type MikroORM } from "@devmentor/db";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor } from "./support/accounts";
import { createBrowser, type Browser } from "./support/browser";

const baseUrl = inject("baseUrl");
const SEEDED_TECHNOLOGIES = 8;

describe("panel admina w przeglądarce (agent-browser)", () => {
  let browser: Browser;
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
    browser = createBrowser();
    // Panel wymaga roli operatora: przeglądarka dostaje ciasteczko sesji konta z fixture'a.
    const operator = await createAccount(orm.em.fork(), { email: "panel-ui@example.com", roles: ["operator"] });
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

  it("/admin pokazuje połączenie z bazą", async () => {
    await browser.run("open", `${baseUrl}/admin`);
    await browser.run("wait", "--text", "Połączono");

    expect(await browser.run("get", "text", "[data-slot=badge]")).toMatch(/Połączono · PostgreSQL 17\./);
  });

  it("/admin/technologies listuje słownik w DataTable", async () => {
    await browser.run("open", `${baseUrl}/admin/technologies`);
    await browser.run("wait", "--text", "TypeScript");

    expect(Number(await browser.run("get", "count", "tbody tr"))).toBe(SEEDED_TECHNOLOGIES);
  });

  it("CrudForm waliduje po stronie klienta, a błąd serwera (zajęty slug) pokazuje komunikat", async () => {
    await browser.run("find", "role", "button", "click", "--name", "Dodaj");
    await browser.run("wait", "--text", "Podaj nazwę");

    await browser.run("find", "label", "Nazwa", "fill", "Go lang");
    await browser.run("find", "label", "Slug", "fill", "typescript");
    await browser.run("find", "role", "button", "click", "--name", "Dodaj");
    await browser.run("wait", "--text", "Technologia o tej nazwie lub slugu już istnieje");

    expect(await browser.run("get", "text", "[role=alert]")).toContain("już istnieje");
    expect(Number(await browser.run("get", "count", "tbody tr"))).toBe(SEEDED_TECHNOLOGIES);
  });

  it("/admin/outbox pokazuje tytuł, adnotację i pustą skrzynkę, a nawigacja ma pozycję „Skrzynka”", async () => {
    await browser.run("open", `${baseUrl}/admin/outbox`);
    await browser.run("wait", "--text", "Brak wiadomości");

    expect(await browser.run("get", "text", "h1")).toBe("Skrzynka");
    expect(await browser.run("get", "text", "main")).toContain("Skrzynka deweloperska — wiadomości nie są wysyłane");
    expect(await browser.run("get", "text", "main")).toContain("Skrzynka czyści się po restarcie serwera.");
    expect(Number(await browser.run("get", "count", "nav a[href='/admin/outbox']"))).toBe(1);
  });
});
