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
const FORBIDDEN = { code: "FORBIDDEN", message: "Brak uprawnień" };

interface Envelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

interface InvitationBody {
  id: string;
  email: string;
  status: string;
}

/** Scenariusz: `.ai/qa/E01/E01-002-mentee-nie-ma-dostepu-do-zaproszen-operatora.md`. */
describe("E01-002: trasy zaproszeń są zarezerwowane dla operatora", () => {
  const baseUrl = inject("baseUrl");
  let orm: MikroORM;
  let operatorCookie: string;
  let menteeCookie: string;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    const em = orm.em.fork();
    operatorCookie = await createOperatorAndLogIn(em, baseUrl, {
      email: `e01-002-operator-${randomUUID()}@example.com`,
      password: PASSWORD,
    });
    const mentee = await createAccount(em, { email: `e01-002-mentee-${randomUUID()}@example.com`, roles: ["mentee"] });
    menteeCookie = await sessionCookieFor(mentee);
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  function call(path: string, cookie: string, body?: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1", ...uniqueClientIp(), cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function listInvitations(): Promise<InvitationBody[]> {
    const response = await call("/api/auth/invitations", operatorCookie);
    expect(response.status).toBe(200);
    return ((await response.json()) as Envelope<InvitationBody[]>).data!;
  }

  it("E01-002: mentee dostaje 403 bez danych na trasach zaproszeń operatora i niczego tam nie tworzy", async () => {
    // Given: operator ma na liście jedno oczekujące zaproszenie.
    const existing = `${TEST_EMAIL_PREFIX}e01-002-istniejacy-${randomUUID()}@example.com`;
    expect((await call("/api/auth/invitations", operatorCookie, { email: existing })).status).toBe(201);
    const listBefore = await listInvitations();
    expect(listBefore.map((invitation) => invitation.email)).toContain(existing);
    const attempted = `${TEST_EMAIL_PREFIX}e01-002-proba-${randomUUID()}@example.com`;

    // When: zalogowany mentee próbuje odczytać listę i utworzyć zaproszenie.
    const read = await call("/api/auth/invitations", menteeCookie);
    const create = await call("/api/auth/invitations", menteeCookie, { email: attempted });

    // Then: oba żądania to 403 bez danych (tylko koperta błędu, bez linku i bez listy).
    for (const response of [read, create]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: FORBIDDEN });
    }

    // And: kontrola pozytywna — mentee ma dostęp do własnego konta, operator do tras zaproszeń.
    expect((await call("/api/auth/me", menteeCookie)).status).toBe(200);
    expect((await call("/api/auth/invitations", operatorCookie)).status).toBe(200);

    // And: lista zaproszeń i baza są bez zmian — próba nie zostawiła śladu.
    expect(await listInvitations()).toEqual(listBefore);
    expect(await orm.em.fork().count(MentorInvitation, { email: attempted })).toBe(0);
  });
});
