import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initOrm, User, UserToken, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { createOperatorAndLogIn, deleteTestAccounts, TEST_EMAIL_PREFIX } from "./support/accounts";
import { uniqueClientIp } from "./support/client-ip";
import { TEST_AUTH_JWT_SECRET } from "./support/test-env";

const LOG_WAIT_TIMEOUT_MS = 10_000;
const LOG_POLL_INTERVAL_MS = 100;

interface OutboxMessage {
  id: string;
  to: string;
  text: string;
}

/**
 * Kryterium 17.6 i „Kryteria akceptacji epiku” E01: hasło, token, hash ani JWT nie trafiają do logów
 * procesu `next start` (cały stdout + stderr przy `LOG_LEVEL=trace`, `support/app-server.ts`) ani do odpowiedzi.
 */
describe("sekrety kont nie trafiają do logów ani odpowiedzi (next start, LOG_LEVEL=trace)", () => {
  const baseUrl = inject("baseUrl");
  const logPath = inject("appLogPath");
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

  function post(path: string, body: unknown, cookie?: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-devmentor-request": "1",
        ...uniqueClientIp(),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  /** Wartość ciasteczka sesji (JWT) z odpowiedzi. */
  function sessionToken(response: Response): string {
    const value = response.headers.getSetCookie()[0]!.split(";")[0]!.split("=")[1];
    expect(value).toBeTruthy();
    return value!;
  }

  async function outboxFor(email: string, operatorCookie: string): Promise<OutboxMessage[]> {
    const response = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
    return ((await response.json()) as { data: OutboxMessage[] }).data.filter((message) => message.to === email);
  }

  function tokenIn(message: OutboxMessage): string {
    const token = /#token=([\w-]+)/.exec(message.text)?.[1];
    expect(token).toBeTruthy();
    return token!;
  }

  /** Czeka, aż log procesu dojdzie do znacznika — wszystko, co zalogowały wcześniejsze żądania, jest już w pliku. */
  async function logUpTo(marker: string): Promise<string> {
    const deadline = Date.now() + LOG_WAIT_TIMEOUT_MS;
    for (;;) {
      const log = await readFile(logPath, "utf8");
      if (log.includes(marker) || Date.now() > deadline) {
        return log;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, LOG_POLL_INTERVAL_MS));
    }
  }

  it("rejestracja → logowanie (złe i dobre hasło) → me → resend → confirm: brak hasła, tokenów, hashy, JWT i adresu w logach", async () => {
    const suffix = randomUUID();
    const email = `${TEST_EMAIL_PREFIX}sekrety-${suffix}@example.com`;
    const password = `haslo-do-logow-${suffix}`;
    const wrongPassword = `zle-haslo-do-logow-${suffix}`;
    const operatorPassword = `haslo-operatora-${suffix}`;
    const operatorCookie = await createOperatorAndLogIn(orm.em.fork(), baseUrl, {
      email: `sekrety-operator-${suffix}@example.com`,
      password: operatorPassword,
    });

    const registered = await post("/api/auth/register", { email, password, displayName: "Konto testowe" });
    expect(registered.status).toBe(201);
    const registerJwt = sessionToken(registered);
    const responses = [await registered.text()];

    const wrong = await post("/api/auth/login", { email, password: wrongPassword });
    expect(wrong.status).toBe(401);
    responses.push(await wrong.text());
    const loggedIn = await post("/api/auth/login", { email, password });
    expect(loggedIn.status).toBe(200);
    const loginJwt = sessionToken(loggedIn);
    responses.push(await loggedIn.text());
    const cookie = `devmentor_session=${loginJwt}`;

    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
    expect(me.status).toBe(200);
    responses.push(await me.text());

    const resent = await post("/api/auth/email-verification/resend", {}, cookie);
    expect(resent.status).toBe(200);
    responses.push(await resent.text());
    const messages = await outboxFor(email, operatorCookie);
    expect(messages).toHaveLength(2);
    const [current, previous] = messages.map(tokenIn);
    const user = await orm.em.fork().findOneOrFail(User, { email });
    const stored = await orm.em.fork().findOneOrFail(UserToken, { user: user.id });

    const stale = await post("/api/auth/email-verification/confirm", { token: previous });
    expect(stale.status).toBe(400);
    responses.push(await stale.text());
    const confirmed = await post("/api/auth/email-verification/confirm", { token: current });
    expect(confirmed.status).toBe(200);
    responses.push(await confirmed.text());

    // Znacznik końca scenariusza: rejestracja drugiego konta loguje ID swojej wiadomości (adapter outbox, poziom info).
    const sentinelEmail = `${TEST_EMAIL_PREFIX}sekrety-znacznik-${suffix}@example.com`;
    expect((await post("/api/auth/register", { email: sentinelEmail, password, displayName: "Znacznik" })).status).toBe(201);
    const [sentinel] = await outboxFor(sentinelEmail, operatorCookie);
    const log = await logUpTo(sentinel!.id);

    // Log jest prawdziwy i kompletny: zawiera wpisy adaptera poczty dla wiadomości z tego scenariusza.
    for (const message of messages) {
      expect(log).toContain(message.id);
    }
    expect(log).toContain(sentinel!.id);

    const secrets = {
      password,
      wrongPassword,
      operatorPassword,
      currentToken: current!,
      previousToken: previous!,
      tokenHash: stored.tokenHash,
      passwordHash: user.passwordHash!,
      registerJwt,
      loginJwt,
      operatorJwt: operatorCookie.split("=")[1]!,
      jwtSecret: TEST_AUTH_JWT_SECRET,
    };
    for (const [name, value] of Object.entries(secrets)) {
      expect(log.includes(value), `${name} w logu next start`).toBe(false);
    }
    // Adres e-mail to dane osobowe — redagowany (`LOG_REDACT_PATHS`).
    expect(log.includes(email), "e-mail w logu next start").toBe(false);

    for (const body of responses) {
      for (const [name, value] of Object.entries(secrets)) {
        expect(body.includes(value), `${name} w odpowiedzi API`).toBe(false);
      }
    }
  });
});
