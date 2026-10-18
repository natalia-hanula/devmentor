import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createBrowser, type Browser } from "./support/browser";

const baseUrl = inject("baseUrl");
const SEEDED_TECHNOLOGIES = 8;

describe("panel admina w przeglądarce (agent-browser)", () => {
  let browser: Browser;

  beforeAll(() => {
    browser = createBrowser();
  });

  afterAll(async () => {
    await browser.close();
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

  it("CrudForm waliduje po stronie klienta, a zapis bez sesji kończy się komunikatem 401", async () => {
    await browser.run("find", "role", "button", "click", "--name", "Dodaj");
    await browser.run("wait", "--text", "Podaj nazwę");

    await browser.run("find", "label", "Nazwa", "fill", "Go");
    await browser.run("find", "label", "Slug", "fill", "go");
    await browser.run("find", "role", "button", "click", "--name", "Dodaj");
    await browser.run("wait", "--text", "Wymagane zalogowanie");

    expect(await browser.run("get", "text", "[role=alert]")).toContain("Wymagane zalogowanie");
    expect(Number(await browser.run("get", "count", "tbody tr"))).toBe(SEEDED_TECHNOLOGIES);
  });
});
