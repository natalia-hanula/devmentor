import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initOrm, MentorInvitation, User, UserRole, type MikroORM } from "@devmentor/db";
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

  describe("przyjęcie zaproszenia (POST /api/auth/invitations/accept)", () => {
    const accept = (token: string, cookie?: string) =>
      fetch(`${baseUrl}/api/auth/invitations/accept`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-devmentor-request": "1",
          ...uniqueClientIp(),
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ token }),
      });

    const me = async (cookie: string) =>
      ((await (await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })).json()) as Envelope<{ roles: string[] }>).data;

    async function menteeCookie(name: string): Promise<{ cookie: string; user: User }> {
      const user = await createAccount(orm.em.fork(), { email: `${name}-${randomUUID()}@example.com`, roles: ["mentee"] });
      return { cookie: await sessionCookieFor(user), user };
    }

    async function invitationFor(email: string): Promise<{ token: string; id: string }> {
      const result = await created(await create(email));
      return { token: tokenOf(result.link), id: result.invitation.id };
    }

    it("mentee przyjmuje zaproszenie: 200, rola mentor (obok mentee), konto w odpowiedzi bez hasha, granted_by to operator", async () => {
      const { cookie, user } = await menteeCookie("przyjmuje");
      const { token, id } = await invitationFor(uniqueEmail());

      const response = await accept(token, cookie);

      expect(response.status).toBe(200);
      const body = (await response.json()) as Envelope<{ account: { id: string; roles: string[] }; alreadyMentor: boolean }>;
      expect(body.data.alreadyMentor).toBe(false);
      expect(body.data.account).toMatchObject({ id: user.id, roles: ["mentee", "mentor"] });
      expect(JSON.stringify(body)).not.toContain("passwordHash");
      expect((await me(cookie)).roles).toEqual(["mentee", "mentor"]);
      const role = await orm.em.fork().findOneOrFail(UserRole, { user: user.id, role: "mentor" });
      const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { id });
      // `granted_by` z `UPDATE … RETURNING created_by_id` — autor zaproszenia.
      expect(stored.createdBy).not.toBeNull();
      expect(role.grantedBy?.id).toBe(stored.createdBy?.id);
      expect(stored.acceptedAt).toBeInstanceOf(Date);
      expect(stored.acceptedBy?.id).toBe(user.id);
      const listed = (await list()).find((entry) => entry.id === id) as InvitationBody & { acceptedBy: { id: string; mentorRoleRemoved: boolean } };
      expect(listed.status).toBe("accepted");
      expect(listed.acceptedBy).toMatchObject({ id: user.id, mentorRoleRemoved: false });
    });

    it("zaproszenie można przyjąć kontem z innym adresem niż zaproszony (Q15)", async () => {
      const { cookie } = await menteeCookie("inny-adres");
      const { token } = await invitationFor(uniqueEmail());

      expect((await accept(token, cookie)).status).toBe(200);
    });

    it("ten sam link drugi raz, zły token, wygasłe i cofnięte → ten sam 400 „Zaproszenie jest nieważne”, bez roli", async () => {
      const first = await menteeCookie("pierwszy");
      const second = await menteeCookie("drugi");
      const used = await invitationFor(uniqueEmail());
      expect((await accept(used.token, first.cookie)).status).toBe(200);
      const expired = await invitationFor(uniqueEmail());
      await orm.em.fork().nativeUpdate(MentorInvitation, { id: expired.id }, { expiresAt: new Date(Date.now() - 1000) });
      const revoked = await invitationFor(uniqueEmail());
      await call("DELETE", { path: `?id=${revoked.id}`, cookie: operatorCookie });

      for (const token of [used.token, "zmyslony-token", expired.token, revoked.token]) {
        const response = await accept(token, second.cookie);
        expect(response.status).toBe(400);
        expect(((await response.json()) as Envelope).error).toEqual({ code: "VALIDATION_ERROR", message: "Zaproszenie jest nieważne" });
      }
      expect((await me(second.cookie)).roles).toEqual(["mentee"]);
    });

    it("drugie zaproszenie na ten sam adres unieważnia link pierwszego: pierwszy token → 400, drugi → 200", async () => {
      const { cookie } = await menteeCookie("nowy-link");
      const email = uniqueEmail();
      const first = await invitationFor(email);
      const second = await invitationFor(email);

      const stale = await accept(first.token, cookie);
      expect(stale.status).toBe(400);
      expect(((await stale.json()) as Envelope).error.message).toBe("Zaproszenie jest nieważne");
      expect((await accept(second.token, cookie)).status).toBe(200);
    });

    it("operator dostaje 403 i nie zużywa zaproszenia — link nadal działa dla mentee", async () => {
      const { token, id } = await invitationFor(uniqueEmail());

      expect((await accept(token, operatorCookie)).status).toBe(403);

      expect((await orm.em.fork().findOneOrFail(MentorInvitation, { id })).acceptedAt).toBeNull();
      const { cookie } = await menteeCookie("po-operatorze");
      expect((await accept(token, cookie)).status).toBe(200);
    });

    it("konto, które już jest mentorem: 200 alreadyMentor, zaproszenie zużyte (link martwy), rola bez zmian", async () => {
      const mentor = await createAccount(orm.em.fork(), { email: `mentor-${randomUUID()}@example.com`, roles: ["mentee", "mentor"] });
      const cookie = await sessionCookieFor(mentor);
      const { token, id } = await invitationFor(uniqueEmail());

      const response = await accept(token, cookie);

      expect(response.status).toBe(200);
      expect(((await response.json()) as Envelope<{ alreadyMentor: boolean }>).data.alreadyMentor).toBe(true);
      expect((await orm.em.fork().findOneOrFail(MentorInvitation, { id })).acceptedAt).toBeInstanceOf(Date);
      expect(await orm.em.fork().count(UserRole, { user: mentor.id, role: "mentor" })).toBe(1);
      expect((await accept(token, cookie)).status).toBe(400);
    });

    it("bez sesji 401, bez CSRF 403, bez tokenu w body 400", async () => {
      const { token } = await invitationFor(uniqueEmail());
      const { cookie } = await menteeCookie("walidacja");

      expect((await accept(token)).status).toBe(401);
      const withoutCsrf = await fetch(`${baseUrl}/api/auth/invitations/accept`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, ...uniqueClientIp() },
        body: JSON.stringify({ token }),
      });
      expect(withoutCsrf.status).toBe(403);
      expect((await accept("", cookie)).status).toBe(400);
    });

    it("dwa konta przyjmują ten sam link równocześnie: dokładnie jedno zostaje mentorem (200), drugie dostaje 400", async () => {
      const a = await menteeCookie("wyscig-a");
      const b = await menteeCookie("wyscig-b");
      const { token, id } = await invitationFor(uniqueEmail());

      const responses = await Promise.all([accept(token, a.cookie), accept(token, b.cookie)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
      const mentors = await orm.em.fork().count(UserRole, { role: "mentor", user: { id: { $in: [a.user.id, b.user.id] } } });
      expect(mentors).toBe(1);
      const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { id });
      expect([a.user.id, b.user.id]).toContain(stored.acceptedBy?.id);
      expect(await orm.em.fork().count(UserRole, { role: "mentor", user: stored.acceptedBy!.id })).toBe(1);
    });

    it("token zaproszenia z przyjęcia nie trafia do logów procesu next start", async () => {
      const { cookie } = await menteeCookie("logi");
      const { token } = await invitationFor(uniqueEmail());
      await accept(token, cookie);
      await accept(token, cookie);
      const sentinel = uniqueEmail();
      const marker = await created(await create(sentinel));
      const outbox = await fetch(`${baseUrl}/api/mail/outbox`, { headers: { cookie: operatorCookie } });
      const message = ((await outbox.json()) as Envelope<{ id: string; to: string }[]>).data.find((entry) => entry.to === sentinel)!;
      expect(marker.mailFailed).toBe(false);

      const deadline = Date.now() + LOG_WAIT_TIMEOUT_MS;
      let log = await readFile(logPath, "utf8");
      while (!log.includes(message.id) && Date.now() < deadline) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, LOG_POLL_INTERVAL_MS));
        log = await readFile(logPath, "utf8");
      }

      expect(log).toContain(message.id);
      expect(log.includes(token), "token w logu next start").toBe(false);
    });
  });

  describe("odebranie roli mentora (DELETE /api/auth/mentor-roles)", () => {
    const removeRole = (userId: string, cookie?: string) =>
      fetch(`${baseUrl}/api/auth/mentor-roles?userId=${userId}`, {
        method: "DELETE",
        headers: { "x-devmentor-request": "1", ...uniqueClientIp(), ...(cookie ? { cookie } : {}) },
      });

    async function mentorViaInvitation(): Promise<{ cookie: string; user: User; invitationId: string }> {
      const user = await createAccount(orm.em.fork(), { email: `odbierany-${randomUUID()}@example.com`, roles: ["mentee"] });
      const cookie = await sessionCookieFor(user);
      const result = await created(await create(uniqueEmail()));
      const accepted = await fetch(`${baseUrl}/api/auth/invitations/accept`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-devmentor-request": "1", cookie, ...uniqueClientIp() },
        body: JSON.stringify({ token: tokenOf(result.link) }),
      });
      expect(accepted.status).toBe(200);
      return { cookie, user, invitationId: result.invitation.id };
    }

    const openMentorPage = async (cookie: string) =>
      (await fetch(`${baseUrl}/mentor`, { redirect: "manual", headers: { cookie } })).text();

    it("po odebraniu roli /mentor daje „Brak dostępu” przy następnym żądaniu, a lista pokazuje „rola mentora odebrana” (L10)", async () => {
      const { cookie, user, invitationId } = await mentorViaInvitation();
      expect(await openMentorPage(cookie)).toContain("Panel mentora</h1>");

      const removed = await removeRole(user.id, operatorCookie);

      expect(removed.status).toBe(200);
      expect(((await removed.json()) as Envelope<{ userId: string }>).data).toEqual({ userId: user.id });
      const page = await openMentorPage(cookie);
      expect(page).toContain("Ta strona wymaga roli mentora.");
      expect(page).not.toContain("Panel mentora</h1>");
      const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
      expect(((await meResponse.json()) as Envelope<{ roles: string[] }>).data.roles).toEqual(["mentee"]);
      const listed = (await list()).find((entry) => entry.id === invitationId) as InvitationBody & {
        acceptedBy: { mentorRoleRemoved: boolean };
      };
      expect(listed.status).toBe("accepted");
      expect(listed.acceptedBy.mentorRoleRemoved).toBe(true);
    });

    it("rola mentee zostaje; drugie odebranie → 404; mentee i mentor dostają 403, gość 401, zły userId 400", async () => {
      const { cookie, user } = await mentorViaInvitation();

      expect((await removeRole(user.id, cookie)).status).toBe(403);
      expect((await removeRole(user.id)).status).toBe(401);
      expect((await removeRole("nie-uuid", operatorCookie)).status).toBe(400);
      expect((await removeRole(user.id, operatorCookie)).status).toBe(200);

      expect(await orm.em.fork().count(UserRole, { user: user.id, role: "mentee" })).toBe(1);
      expect(await orm.em.fork().count(UserRole, { user: user.id, role: "mentor" })).toBe(0);
      const again = await removeRole(user.id, operatorCookie);
      expect(again.status).toBe(404);
      expect(((await again.json()) as Envelope).error.message).toBe("Konto nie ma roli mentora");
    });

    it("żądanie bez nagłówka CSRF → 403, rola zostaje", async () => {
      const { user } = await mentorViaInvitation();

      const response = await fetch(`${baseUrl}/api/auth/mentor-roles?userId=${user.id}`, {
        method: "DELETE",
        headers: { cookie: operatorCookie, ...uniqueClientIp() },
      });

      expect(response.status).toBe(403);
      expect(await orm.em.fork().count(UserRole, { user: user.id, role: "mentor" })).toBe(1);
    });
  });
});
