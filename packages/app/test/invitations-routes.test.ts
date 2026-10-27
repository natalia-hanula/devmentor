import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@devmentor/core";

const OPERATOR = { userId: "0b0e5a8e-6a43-4c1a-9f0e-6f2f9b1c7d11", roles: ["operator"], emailVerified: true };
const INVITATION_ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const TOKEN = "TajnyTokenZaproszenia_1234567890abcdefghijk";
const CREATED = {
  invitation: { id: INVITATION_ID, email: "adam@example.com", status: "pending" },
  link: `https://devmentor.example/invite#token=${TOKEN}`,
  revokedPrevious: false,
  mailFailed: false,
};

const cradle = {
  invitationService: { list: vi.fn(), create: vi.fn(), revoke: vi.fn() },
};

const logLines = vi.hoisted((): string[] => []);
vi.mock("../../core/src/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/src/logger")>();
  const logger = actual.createLogger({ level: "trace", destination: { write: (line: string) => logLines.push(line) } });
  return { ...actual, getLogger: () => logger };
});

vi.mock("../../core/src/container/container", () => ({
  withScope: (work: (c: typeof cradle) => Promise<unknown>) => work(cradle),
}));

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../../core/src/http/session", () => ({ getSession }));

const invitations = await import("../app/api/auth/invitations/route");

const context = { params: Promise.resolve({}) };
const URL_BASE = "http://localhost/api/auth/invitations";

function call(method: "GET" | "POST" | "DELETE", { path = "", body, marker = true }: { path?: string; body?: unknown; marker?: boolean } = {}) {
  const request = new Request(`${URL_BASE}${path}`, {
    method,
    headers: { ...(marker && { "x-devmentor-request": "1" }), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return invitations[method](request, context);
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(OPERATOR);
  logLines.length = 0;
});

describe("/api/auth/invitations — dostęp", () => {
  const requests = {
    GET: () => call("GET"),
    POST: () => call("POST", { body: { email: "adam@example.com" } }),
    DELETE: () => call("DELETE", { path: `?id=${INVITATION_ID}` }),
  };

  it.each(Object.entries(requests))("%s bez sesji → 401, serwis nie jest wołany", async (_method, run) => {
    getSession.mockResolvedValue(null);

    expect((await run()).status).toBe(401);
    expect(Object.values(cradle.invitationService).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it.each([["mentee"], ["mentor"]])("%s → 403 na każdej metodzie", async (role) => {
    getSession.mockResolvedValue({ ...OPERATOR, roles: [role] });

    for (const run of Object.values(requests)) {
      const response = await run();
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    }
    expect(Object.values(cradle.invitationService).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("POST i DELETE bez nagłówka CSRF → 403", async () => {
    expect((await call("POST", { body: { email: "adam@example.com" }, marker: false })).status).toBe(403);
    expect((await call("DELETE", { path: `?id=${INVITATION_ID}`, marker: false })).status).toBe(403);
    expect(cradle.invitationService.create).not.toHaveBeenCalled();
    expect(cradle.invitationService.revoke).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/invitations", () => {
  it("operator dostaje listę z serwisu w kopercie API", async () => {
    cradle.invitationService.list.mockResolvedValue([CREATED.invitation]);

    const response = await call("GET");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: [CREATED.invitation] });
  });
});

describe("POST /api/auth/invitations", () => {
  it("201 z wynikiem serwisu (z linkiem); do serwisu trafia id operatora z sesji i tylko sparsowany e-mail", async () => {
    cradle.invitationService.create.mockResolvedValue(CREATED);

    const response = await call("POST", { body: { email: "  Adam@Example.COM ", createdBy: "ktos-inny", role: "operator" } });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: CREATED });
    expect(cradle.invitationService.create).toHaveBeenCalledExactlyOnceWith(OPERATOR.userId, { email: "adam@example.com" });
  });

  it("token z linku nie trafia do logów", async () => {
    cradle.invitationService.create.mockResolvedValue(CREATED);

    await call("POST", { body: { email: "adam@example.com" } });

    expect(logLines.join("")).not.toContain(TOKEN);
  });

  it("niepoprawny e-mail → 400 z fieldErrors, serwis nie jest wołany", async () => {
    const response = await call("POST", { body: { email: "nie-adres" } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(Object.keys(body.error.fieldErrors)).toEqual(["email"]);
    expect(cradle.invitationService.create).not.toHaveBeenCalled();
  });

  it("wyścig przy tworzeniu → 409 z komunikatem z serwisu", async () => {
    cradle.invitationService.create.mockRejectedValue(new ConflictError("Zaproszenie dla tego adresu właśnie powstało — odśwież listę"));

    const response = await call("POST", { body: { email: "adam@example.com" } });

    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toBe("Zaproszenie dla tego adresu właśnie powstało — odśwież listę");
  });
});

describe("DELETE /api/auth/invitations?id=", () => {
  it("cofa zaproszenie o podanym id i zwraca je w kopercie", async () => {
    cradle.invitationService.revoke.mockResolvedValue(undefined);

    const response = await call("DELETE", { path: `?id=${INVITATION_ID}` });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: INVITATION_ID } });
    expect(cradle.invitationService.revoke).toHaveBeenCalledExactlyOnceWith(INVITATION_ID);
  });

  it.each([[""], ["?id=nie-uuid"]])("brak lub zły identyfikator (%s) → 400, serwis nie jest wołany", async (path) => {
    expect((await call("DELETE", { path })).status).toBe(400);
    expect(cradle.invitationService.revoke).not.toHaveBeenCalled();
  });

  it("nieznane zaproszenie → 404, przyjęte → 409", async () => {
    cradle.invitationService.revoke.mockRejectedValueOnce(new NotFoundError("Nie znaleziono zaproszenia"));
    cradle.invitationService.revoke.mockRejectedValueOnce(new ConflictError("Zaproszenie zostało już przyjęte"));

    expect((await call("DELETE", { path: `?id=${INVITATION_ID}` })).status).toBe(404);
    expect((await call("DELETE", { path: `?id=${INVITATION_ID}` })).status).toBe(409);
  });
});
