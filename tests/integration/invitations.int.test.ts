import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initOrm, MentorInvitation, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import {
  createAccount,
  createOperatorAndLogIn,
  deleteTestAccounts,
  sessionCookieFor,
  TEST_EMAIL_PREFIX,
} from "./support/accounts";
import { uniqueClientIp } from "./support/client-ip";

const PASSWORD = "integracyjne-haslo-123";
const LOG_WAIT_TIMEOUT_MS = 10_000;
const LOG_POLL_INTERVAL_MS = 100;

interface InvitationBody {
  id: string;
  email: string;
  status: string;
  acceptedBy?: unknown;
}

interface Envelope<T = unknown> {
  ok: boolean;
  data: T;
  error: { code: string; message: string };
}

interface CreatedBody {
  invitation: InvitationBody;
  link: string;
  revokedPrevious: boolean;
  mailFailed: boolean;
}

/** Zaproszenia mentorów (trasy operatora) na `next start` i prawdziwej bazie. */
describe("zaproszenia mentorów: tworzenie, lista, cofanie przez API", () => {
  const baseUrl = inject("baseUrl");
  const logPath = inject("appLogPath");
  let orm: MikroORM;
  let operatorCookie: string;
  let counter = 0;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    operatorCookie = await createOperatorAndLogIn(orm.em.fork(), baseUrl, {
      email: `zaproszenia-operator-${randomUUID()}@example.com`,
      password: PASSWORD,
    });
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  function uniqueEmail(): string {
    counter += 1;
    return `${TEST_EMAIL_PREFIX}zaproszony-${counter}-${randomUUID()}@example.com`;
  }

  function call(method: "GET" | "POST" | "DELETE", { path = "", body, cookie }: { path?: string; body?: unknown; cookie?: string } = {}) {
    return fetch(`${baseUrl}/api/auth/invitations${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-devmentor-request": "1",
        ...uniqueClientIp(),
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  const create = (email: string, cookie = operatorCookie) => call("POST", { body: { email }, cookie });

  async function created(response: Response): Promise<CreatedBody> {
    expect(response.status).toBe(201);
    return ((await response.json()) as Envelope<CreatedBody>).data;
  }

  async function list(): Promise<InvitationBody[]> {
    const response = await call("GET", { cookie: operatorCookie });
    expect(response.status).toBe(200);
    return ((await response.json()) as Envelope<InvitationBody[]>).data;
  }

  const tokenOf = (link: string) => new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;

  it("operator tworzy zaproszenie: 201, link z tokenem we fragmencie, w bazie tylko hash, mail w skrzynce", async () => {
    const email = uniqueEmail();

    const result = await created(await create(email));

    expect(result.invitation).toMatchObject({ email, status: "pending" });
    expect(result.revokedPrevious).toBe(false);
    expect(result.mailFailed).toBe(false);
    const link = new URL(result.link);
    expect(link.origin).toBe(baseUrl);
    expect(link.pathname).toBe("/invite");
    expect(link.search).toBe("");
    const token = tokenOf(result.link);
    const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { email });
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.tokenHash).not.toContain(token);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBeGreaterThan(13.9 * 24 * 60 * 60 * 1000);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBeLessThan(14.1 * 24 * 60 * 60 * 1000);

    const outbox = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
    const messages = ((await outbox.json()) as Envelope<{ to: string; subject: string; text: string }[]>).data.filter(
      (message) => message.to === email,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]!.subject).toBe("Zaproszenie do roli mentora w DevMentor");
    expect(messages[0]!.text).toContain(result.link);
  });

  it("lista pokazuje zaproszenie bez linku i hasha; adres jest normalizowany (wielkość liter, spacje)", async () => {
    const email = uniqueEmail();
    await created(await create(`  ${email.toUpperCase()} `));

    const invitation = (await list()).find((entry) => entry.email === email);

    expect(invitation).toMatchObject({ status: "pending" });
    expect(Object.keys(invitation!).sort()).toEqual(["createdAt", "email", "expiresAt", "id", "status"]);
  });

  it("drugie zaproszenie na ten sam adres cofa pierwsze (revokedPrevious), a jego link przestaje być aktywny", async () => {
    const email = uniqueEmail();
    const first = await created(await create(email));

    const second = await created(await create(email));

    expect(second.revokedPrevious).toBe(true);
    expect(tokenOf(second.link)).not.toBe(tokenOf(first.link));
    const invitations = (await list()).filter((entry) => entry.email === email);
    expect(invitations.map((entry) => entry.status).sort()).toEqual(["pending", "revoked"]);
    expect(invitations.find((entry) => entry.id === first.invitation.id)!.status).toBe("revoked");
  });

  it("zaproszenie po terminie ma status expired, a nowe na ten adres je cofa", async () => {
    const email = uniqueEmail();
    const first = await created(await create(email));
    await orm.em.fork().nativeUpdate(MentorInvitation, { id: first.invitation.id }, { expiresAt: new Date(Date.now() - 1000) });

    expect((await list()).find((entry) => entry.id === first.invitation.id)!.status).toBe("expired");
    const second = await created(await create(email));

    expect(second.revokedPrevious).toBe(true);
    expect((await list()).find((entry) => entry.id === first.invitation.id)!.status).toBe("revoked");
  });

  it("sześć równoczesnych zaproszeń na ten sam adres: każde 201 albo 409, w bazie jedno aktywne", async () => {
    const email = uniqueEmail();

    const responses = await Promise.all(Array.from({ length: 6 }, () => create(email)));

    const statuses = responses.map((response) => response.status);
    expect(statuses.every((status) => status === 201 || status === 409)).toBe(true);
    expect(statuses).toContain(201);
    const conflict = responses.find((response) => response.status === 409);
    if (conflict) {
      expect(((await conflict.json()) as Envelope).error.message).toBe(
        "Zaproszenie dla tego adresu właśnie powstało — odśwież listę",
      );
    }
    expect((await list()).filter((entry) => entry.email === email && entry.status === "pending")).toHaveLength(1);
  });

  it("cofnięcie: oczekujące → revoked; ponowne cofnięcie 200; przyjęte → 409; nieznane → 404; zły id → 400", async () => {
    const pending = await created(await create(uniqueEmail()));

    expect((await call("DELETE", { path: `?id=${pending.invitation.id}`, cookie: operatorCookie })).status).toBe(200);
    expect((await list()).find((entry) => entry.id === pending.invitation.id)!.status).toBe("revoked");
    expect((await call("DELETE", { path: `?id=${pending.invitation.id}`, cookie: operatorCookie })).status).toBe(200);

    const accepted = await created(await create(uniqueEmail()));
    await orm.em.fork().nativeUpdate(MentorInvitation, { id: accepted.invitation.id }, { acceptedAt: new Date() });
    const conflict = await call("DELETE", { path: `?id=${accepted.invitation.id}`, cookie: operatorCookie });
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as Envelope).error.message).toBe("Zaproszenie zostało już przyjęte");
    expect((await list()).find((entry) => entry.id === accepted.invitation.id)!.status).toBe("accepted");

    expect((await call("DELETE", { path: `?id=${randomUUID()}`, cookie: operatorCookie })).status).toBe(404);
    expect((await call("DELETE", { path: "?id=nie-uuid", cookie: operatorCookie })).status).toBe(400);
  });

  it("bez sesji 401; mentee i mentor 403 na liście, tworzeniu i cofaniu; niepoprawny e-mail 400", async () => {
    const mentee = await sessionCookieFor(await createAccount(orm.em.fork(), { email: "mentee-zapr@example.com", roles: ["mentee"] }));
    const mentor = await sessionCookieFor(
      await createAccount(orm.em.fork(), { email: "mentor-zapr@example.com", roles: ["mentee", "mentor"] }),
    );
    const id = randomUUID();

    expect((await call("GET")).status).toBe(401);
    expect((await call("POST", { body: { email: uniqueEmail() } })).status).toBe(401);
    for (const cookie of [mentee, mentor]) {
      expect((await call("GET", { cookie })).status).toBe(403);
      expect((await create(uniqueEmail(), cookie)).status).toBe(403);
      expect((await call("DELETE", { path: `?id=${id}`, cookie })).status).toBe(403);
    }
    expect(await orm.em.fork().count(MentorInvitation, { email: { $like: `${TEST_EMAIL_PREFIX}%` } })).toBe(0);

    const invalid = await create("nie-adres");
    expect(invalid.status).toBe(400);
  });

  it("żądanie bez nagłówka CSRF → 403, zaproszenie nie powstaje", async () => {
    const email = uniqueEmail();

    const response = await fetch(`${baseUrl}/api/auth/invitations`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: operatorCookie, ...uniqueClientIp() },
      body: JSON.stringify({ email }),
    });

    expect(response.status).toBe(403);
    expect(await orm.em.fork().count(MentorInvitation, { email })).toBe(0);
  });

  it("token zaproszenia i jego hash nie trafiają do logów procesu next start", async () => {
    const email = uniqueEmail();
    const result = await created(await create(email));
    const token = tokenOf(result.link);
    const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { email });
    // Znacznik końca: wiadomość zaproszenia loguje ID adaptera outbox, więc log jest kompletny po jego pojawieniu się.
    const outbox = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
    const message = ((await outbox.json()) as Envelope<{ id: string; to: string }[]>).data.find((entry) => entry.to === email)!;

    const deadline = Date.now() + LOG_WAIT_TIMEOUT_MS;
    let log = await readFile(logPath, "utf8");
    while (!log.includes(message.id) && Date.now() < deadline) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, LOG_POLL_INTERVAL_MS));
      log = await readFile(logPath, "utf8");
    }

    expect(log).toContain(message.id);
    expect(log.includes(token), "token w logu next start").toBe(false);
    expect(log.includes(stored.tokenHash), "hash tokenu w logu next start").toBe(false);
    expect(log.includes(email), "e-mail w logu next start").toBe(false);
  });
});
