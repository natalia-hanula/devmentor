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

describe("bramka strony /mentor na prawdziwej aplikacji", () => {
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

  const open = (path: string, cookie?: string) =>
    fetch(`${baseUrl}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

  it("gość (bez ciasteczka) → przekierowanie na /login?next=/mentor", async () => {
    const response = await open("/mentor");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/login?next=%2Fmentor");
  });

  it("mentee widzi „Brak dostępu” z treścią L09 (rola mentora), bez treści panelu", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "mentor-strona-mentee@example.com", roles: ["mentee"] });

    const body = await (await open("/mentor", await sessionCookieFor(mentee))).text();

    expect(body).toContain("Nie masz dostępu do tej strony");
    expect(body).toContain("Ta strona wymaga roli mentora.");
    expect(body).toContain("Wróć do swojej strony startowej");
    expect(body).toContain("Zaloguj się innym kontem");
    expect(body).not.toContain("Panel mentora</h1>");
  });

  it("operator też widzi „Brak dostępu” (Q17: operator nie jest mentorem)", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "mentor-strona-operator@example.com", roles: ["operator"] });

    const body = await (await open("/mentor", await sessionCookieFor(operator))).text();

    expect(body).toContain("Ta strona wymaga roli mentora.");
    expect(body).not.toContain("Panel mentora</h1>");
  });

  it("mentor dostaje panel", async () => {
    const mentor = await createAccount(orm.em.fork(), { email: "mentor-strona-mentor@example.com", roles: ["mentee", "mentor"] });

    const body = await (await open("/mentor", await sessionCookieFor(mentor))).text();

    expect(body).toContain("Panel mentora</h1>");
    expect(body).not.toContain("Nie masz dostępu");
  });

  it("ciasteczko bez ważnej sesji → przekierowanie na /login z „Sesja wygasła”", async () => {
    const body = await (await open("/mentor", "devmentor_session=to-nie-jest-jwt")).text();

    expect(body).toContain("NEXT_REDIRECT;replace;/login?next=%2Fmentor&notice=session_expired");
  });
});
