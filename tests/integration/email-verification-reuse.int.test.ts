import { initOrm, User, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createOperatorAndLogIn, deleteTestAccounts, TEST_EMAIL_PREFIX } from "./support/accounts";
import { uniqueClientIp } from "./support/client-ip";

const PASSWORD = "integracyjne-haslo-123";
const INVALID_LINK = { code: "VALIDATION_ERROR", message: "Link jest nieważny albo wygasł" };

interface Envelope<T = Record<string, unknown>> {
  ok: boolean;
  data: T;
  error: { code: string; message: string };
}

interface OutboxMessage {
  to: string;
  text: string;
}

/** Scenariusz: `.ai/qa/E01/E01-001-link-weryfikacyjny-uzyty-drugi-raz.md`. */
describe("E01-001: ponowne użycie linku weryfikacyjnego", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;
  let operatorCookie: string;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    operatorCookie = await createOperatorAndLogIn(orm.em.fork(), baseUrl, {
      email: "e01-001-operator@example.com",
      password: PASSWORD,
    });
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  function post(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp() },
      body: JSON.stringify(body),
    });
  }

  async function messagesTo(email: string): Promise<OutboxMessage[]> {
    const response = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
    const body = (await response.json()) as Envelope<OutboxMessage[]>;
    return body.data.filter((message) => message.to === email);
  }

  it("E01-001: link weryfikacyjny użyty drugi raz jest odrzucany jako nieważny", async () => {
    // Given: konto z niepotwierdzonym adresem i jedynym linkiem w skrzynce.
    const email = `${TEST_EMAIL_PREFIX}e01-001-${Date.now()}@example.com`;
    const registered = await post("/api/auth/register", { email, password: PASSWORD, displayName: "Konto testowe" });
    expect(registered.status).toBe(201);
    const [message] = await messagesTo(email);
    const token = new URLSearchParams(new URL(/https?:\/\/\S+/.exec(message!.text)![0]).hash.slice(1)).get("token")!;

    // And: adres potwierdzono tym linkiem.
    const first = await post("/api/auth/email-verification/confirm", { token });
    expect(first.status).toBe(200);
    const verifiedAt = (await orm.em.fork().findOneOrFail(User, { email })).emailVerifiedAt;
    expect(verifiedAt).toBeInstanceOf(Date);

    // When: ten sam link, bez sesji, drugi raz.
    const second = await post("/api/auth/email-verification/confirm", { token });

    // Then: odrzucony, bez sesji, adres nadal potwierdzony tą samą datą, bez nowej wiadomości.
    expect(second.status).toBe(400);
    expect(((await second.json()) as Envelope).error).toEqual(INVALID_LINK);
    expect(second.headers.getSetCookie()).toEqual([]);
    expect((await orm.em.fork().findOneOrFail(User, { email })).emailVerifiedAt).toEqual(verifiedAt);
    expect(await messagesTo(email)).toHaveLength(1);
  });
});
