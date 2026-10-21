import { initOrm, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts, sessionCookieFor } from "./support/accounts";

describe("GET /api/mail/outbox na next start z APP_ENV=test (adapter outbox)", () => {
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

  const getOutbox = (cookie?: string) => fetch(`${baseUrl}/api/mail/outbox`, { headers: cookie ? { cookie } : {} });

  it("bez sesji → 401", async () => {
    const response = await getOutbox();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });

  it("mentee → 403", async () => {
    const mentee = await createAccount(orm.em.fork(), { email: "outbox-mentee@example.com", roles: ["mentee"] });

    const response = await getOutbox(await sessionCookieFor(mentee));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("operator → 200 z listą (skrzynka działa, więc aplikacja wystartowała z outboxem)", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "outbox-operator@example.com", roles: ["operator"] });

    const response = await getOutbox(await sessionCookieFor(operator));
    const body = (await response.json()) as { ok: boolean; data: unknown };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
