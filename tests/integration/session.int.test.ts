import { initOrm, Technology, User, UserRole, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor } from "./support/accounts";

const SLUG_PREFIX = "it-session-";

describe("sesja i bramki ról na prawdziwej aplikacji i bazie (zapisy /api/technologies)", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;
  let counter = 0;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await orm.em.fork().nativeDelete(Technology, { slug: { $like: `${SLUG_PREFIX}%` } });
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  async function createTechnology(cookie?: string) {
    counter += 1;
    const response = await fetch(`${baseUrl}/api/technologies`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-devmentor-request": "1",
        ...(cookie && { cookie }),
      },
      body: JSON.stringify({ name: `IT sesja ${counter}`, slug: `${SLUG_PREFIX}${counter}` }),
    });
    return response.status;
  }

  it("bez ciasteczka zapis daje 401, a z ciasteczkiem bez sensu 401 (fail closed)", async () => {
    expect(await createTechnology()).toBe(401);
    expect(await createTechnology("devmentor_session=to-nie-jest-jwt")).toBe(401);
  });

  it("mentee i mentor dostają 403, operator 201", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "mentee@example.com", roles: ["mentee"] });
    const mentor = await createAccount(orm.em.fork(), { email: "mentor@example.com", roles: ["mentee", "mentor"] });
    const operator = await createAccount(orm.em.fork(), { email: "operator@example.com", roles: ["operator"] });

    expect(await createTechnology(await sessionCookieFor(mentee))).toBe(403);
    expect(await createTechnology(await sessionCookieFor(mentor))).toBe(403);
    expect(await createTechnology(await sessionCookieFor(operator))).toBe(201);
  });

  it("token podpisany obcym sekretem daje 401 nawet dla operatora", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "obcy@example.com", roles: ["operator"] });

    expect(await createTechnology(await sessionCookieFor(operator, "obcy-sekret-dluzszy-niz-trzydziesci-dwa-bajty"))).toBe(
      401,
    );
  });

  it("role są czytane z bazy przy każdym żądaniu: nadana rola działa od razu", async () => {
    const user = await createAccount(orm.em.fork(), { email: "awans@example.com", roles: ["mentee"] });
    const cookie = await sessionCookieFor(user);
    expect(await createTechnology(cookie)).toBe(403);

    const em = orm.em.fork();
    em.create(UserRole, { user: em.getReference(User, user.id), role: "operator" });
    await em.flush();

    expect(await createTechnology(cookie)).toBe(201);
  });

  it("podbicie session_version unieważnia wcześniej wydany token", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "wersja@example.com", roles: ["operator"] });
    const cookie = await sessionCookieFor(operator);
    expect(await createTechnology(cookie)).toBe(201);

    await orm.em.fork().nativeUpdate(User, { id: operator.id }, { sessionVersion: operator.sessionVersion + 1 });

    expect(await createTechnology(cookie)).toBe(401);
  });

  it("token usuniętego konta daje 401", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "usuniety@example.com", roles: ["operator"] });
    const cookie = await sessionCookieFor(operator);

    await orm.em.fork().nativeDelete(User, { id: operator.id });

    expect(await createTechnology(cookie)).toBe(401);
  });
});
