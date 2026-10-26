import { initOrm, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor } from "./support/accounts";

describe("bramki stron panelu operatora na prawdziwej aplikacji", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  // `redirect: "manual"`, bo `/login` powstaje dopiero w E01 — sprawdzamy sam adres przekierowania.
  const open = (path: string, cookie?: string) =>
    fetch(`${baseUrl}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

  it("/admin/* bez ciasteczka: proxy przekierowuje na /login z next", async () => {
    const admin = await open("/admin");
    const technologies = await open("/admin/technologies?strona=2");

    expect(admin.status).toBe(307);
    expect(admin.headers.get("location")).toBe("/login?next=%2Fadmin");
    expect(technologies.status).toBe(307);
    const next = new URL(technologies.headers.get("location")!, baseUrl).searchParams.get("next");
    expect(next).toBe("/admin/technologies?strona=2");
  });

  it("ciasteczko bez ważnego tokenu przechodzi proxy, ale strona przekierowuje na /login (autorytet po stronie strony)", async () => {
    const response = await open("/admin", "devmentor_session=to-nie-jest-jwt");
    const body = await response.text();

    expect(body).toContain("NEXT_REDIRECT;replace;/login?next=%2Fadmin&notice=session_expired");
    expect(body).not.toContain("Stan usług aplikacji");
  });

  it("mentee widzi „Brak dostępu” i nie dostaje treści panelu", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "strona-mentee@example.com", roles: ["mentee"] });

    const response = await open("/admin", await sessionCookieFor(mentee));
    const body = await response.text();

    expect(body).toContain("Nie masz dostępu do tej strony");
    expect(body).toContain("Ta strona wymaga roli operatora.");
    expect(body).not.toContain("Stan usług aplikacji");
  });

  it("mentor (mentee + mentor) na /admin/technologies też widzi „Brak dostępu”", async () => {
    const mentor = await createAccount(orm.em.fork(), {
      email: "strona-mentor@example.com",
      roles: ["mentee", "mentor"],
    });

    const body = await (await open("/admin/technologies", await sessionCookieFor(mentor))).text();

    expect(body).toContain("Nie masz dostępu do tej strony");
    expect(body).not.toContain("Słownik technologii, którymi");
  });

  it("operator dostaje stronę panelu", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "strona-operator@example.com", roles: ["operator"] });
    const cookie = await sessionCookieFor(operator);

    const admin = await (await open("/admin", cookie)).text();
    const technologies = await (await open("/admin/technologies", cookie)).text();

    expect(admin).toContain("Stan usług aplikacji");
    expect(admin).not.toContain("Nie masz dostępu");
    expect(technologies).toContain("Słownik technologii, którymi");
  });
});
