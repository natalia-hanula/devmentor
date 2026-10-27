import { ConflictError } from "@devmentor/core";
import { initOrm, User, UserToken, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { accountServiceFor, deleteTestAccounts, TEST_EMAIL_PREFIX } from "./support/accounts";
import { uniqueClientIp } from "./support/client-ip";

const PASSWORD = "integracyjne-haslo-operatora";

interface Envelope {
  ok: boolean;
  data: Record<string, unknown>;
}

describe("AccountService.createOperator na prawdziwej bazie → logowanie w next start", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;

  /** Serwis jak w kontenerze, na własnym `EntityManager` (to, co robi `withScope` w CLI). */
  const accountService = () => accountServiceFor(orm.em.fork(), baseUrl);

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("konto operatora: tylko rola operator, potwierdzony adres, bez tokenów; loguje się i ma dostęp do skrzynki", async () => {
    const email = `${TEST_EMAIL_PREFIX}operator-cli@example.com`;

    const created = await accountService().createOperator({
      email: `  ${email.toUpperCase()} `,
      displayName: "Operatorka",
      password: PASSWORD,
    });

    expect(created).toMatchObject({ email, roles: ["operator"], emailVerified: true, hasPassword: true });
    const em = orm.em.fork();
    const stored = await em.findOneOrFail(User, { email }, { populate: ["roles"] });
    expect(stored.roles.getItems().map((entry) => entry.role)).toEqual(["operator"]);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await em.count(UserToken, { user: stored.id })).toBe(0);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp() },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.getSetCookie()[0]!.split(";")[0]!;

    const me = (await (await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })).json()) as Envelope;
    expect(me.data).toMatchObject({ email, roles: ["operator"], emailVerified: true });

    const outbox = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie } });
    expect(outbox.status).toBe(200);
  });

  it("drugie konto na ten sam adres (inna wielkość liter) → ConflictError z constraintu", async () => {
    const email = `${TEST_EMAIL_PREFIX}operator-dup@example.com`;
    await accountService().createOperator({ email, displayName: "A", password: PASSWORD });

    await expect(
      accountService().createOperator({ email: email.toUpperCase(), displayName: "B", password: PASSWORD }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await orm.em.fork().count(User, { email })).toBe(1);
  });
});
