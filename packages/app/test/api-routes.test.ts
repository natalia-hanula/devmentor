import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, OutboxMailAdapter } from "@devmentor/core";

const cradle: {
  databaseHealthService: { check: ReturnType<typeof vi.fn> };
  technologyService: Record<"list" | "create" | "update" | "delete", ReturnType<typeof vi.fn>>;
  mailOutbox: OutboxMailAdapter | null;
} = {
  databaseHealthService: { check: vi.fn() },
  technologyService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mailOutbox: null,
};

// Wszystko, co trasy zalogują przez `getLogger()` — do sprawdzenia, że treść wiadomości nie trafia do logów.
const logLines = vi.hoisted((): string[] => []);
vi.mock("../../core/src/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/src/logger")>();
  const logger = actual.createLogger({ level: "trace", destination: { write: (line: string) => logLines.push(line) } });
  return { ...actual, getLogger: () => logger };
});

// Podmieniamy kontener DI (bez bazy) — trasy korzystają z prawdziwych apiHandler/makeCrudRoute.
vi.mock("../../core/src/container/container", () => ({
  withScope: (work: (c: typeof cradle) => Promise<unknown>) => work(cradle),
}));

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../../core/src/http/session", () => ({ getSession }));

const health = await import("../app/api/health/route");
const technologies = await import("../app/api/technologies/route");
const outbox = await import("../app/api/mail/outbox/route");

const context = { params: Promise.resolve({}) };

describe("GET /api/health", () => {
  beforeEach(() => {
    cradle.databaseHealthService.check.mockReset();
  });

  it("zwraca stan bazy w kopercie API", async () => {
    cradle.databaseHealthService.check.mockResolvedValue({ ok: true, serverVersion: "17.11" });

    const response = await health.GET(new Request("http://localhost/api/health"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { ok: true, serverVersion: "17.11" } });
  });
});

const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";

function writeRequest(method: string) {
  return new Request(`http://localhost/api/technologies?id=${ID}`, {
    method,
    headers: { "x-devmentor-request": "1", "content-type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify({ name: "Go", slug: "go" }),
  });
}

const writes = [
  ["POST", technologies.POST],
  ["PUT", technologies.PUT],
  ["DELETE", technologies.DELETE],
] as const;

describe("/api/technologies", () => {
  beforeEach(() => {
    getSession.mockReset();
    getSession.mockResolvedValue(null);
    Object.values(cradle.technologyService).forEach((fn) => fn.mockReset());
  });

  it("udostępnia publiczny odczyt listy", async () => {
    cradle.technologyService.list.mockResolvedValue([{ id: "1", name: "Go" }]);

    const response = await technologies.GET(new Request("http://localhost/api/technologies"), context);

    expect(await response.json()).toEqual({ ok: true, data: [{ id: "1", name: "Go" }] });
  });

  it("wymaga sesji przy zapisie (fail closed)", async () => {
    for (const [method, handler] of writes) {
      expect((await handler(writeRequest(method), context)).status).toBe(401);
    }
    expect(cradle.technologyService.create).not.toHaveBeenCalled();
  });

  it("odmawia zapisu użytkownikowi bez roli operatora (403), także mentorowi", async () => {
    getSession.mockResolvedValue({ userId: "u1", roles: ["mentee", "mentor"], emailVerified: true });

    for (const [method, handler] of writes) {
      expect((await handler(writeRequest(method), context)).status).toBe(403);
    }
    expect(cradle.technologyService.create).not.toHaveBeenCalled();
    expect(cradle.technologyService.update).not.toHaveBeenCalled();
    expect(cradle.technologyService.delete).not.toHaveBeenCalled();
  });

  it("przepuszcza zapis operatora", async () => {
    getSession.mockResolvedValue({ userId: "op1", roles: ["operator"], emailVerified: true });
    cradle.technologyService.create.mockResolvedValue({ id: "1", name: "Go" });

    const response = await technologies.POST(writeRequest("POST"), context);

    expect(response.status).toBe(201);
    expect(cradle.technologyService.create).toHaveBeenCalledWith({ name: "Go", slug: "go" });
  });

  it("odczyt zostaje publiczny także dla zalogowanego mentee", async () => {
    getSession.mockResolvedValue({ userId: "u1", roles: ["mentee"], emailVerified: true });
    cradle.technologyService.list.mockResolvedValue([]);

    expect((await technologies.GET(new Request("http://localhost/api/technologies"), context)).status).toBe(200);
  });
});

describe("GET /api/mail/outbox", () => {
  const SECRET_LINK = "http://localhost:3000/verify-email#token=sekretny-token";
  const outboxRequest = () => new Request("http://localhost/api/mail/outbox");

  function newOutbox() {
    const times = [new Date("2026-10-21T08:00:00.000Z"), new Date("2026-10-21T09:00:00.000Z")];
    return new OutboxMailAdapter({ logger: createLogger({ level: "silent" }), now: () => times.shift()! });
  }

  beforeEach(() => {
    getSession.mockReset();
    getSession.mockResolvedValue(null);
    cradle.mailOutbox = newOutbox();
    logLines.length = 0;
  });

  it("bez sesji → 401", async () => {
    const response = await outbox.GET(outboxRequest(), context);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("mentee i mentor → 403, także gdy skrzynka jest wyłączona (nie zdradza jej stanu)", async () => {
    for (const roles of [["mentee"], ["mentee", "mentor"]]) {
      getSession.mockResolvedValue({ userId: "u1", roles, emailVerified: true });
      for (const mailOutbox of [newOutbox(), null]) {
        cradle.mailOutbox = mailOutbox;
        expect((await outbox.GET(outboxRequest(), context)).status).toBe(403);
      }
    }
  });

  it("operator przy adapterze noop (mailOutbox = null) → 404", async () => {
    getSession.mockResolvedValue({ userId: "op1", roles: ["operator"], emailVerified: true });
    cradle.mailOutbox = null;

    const response = await outbox.GET(outboxRequest(), context);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("operator dostaje listę od najnowszej, tylko pola DTO, a treść nie trafia do logów", async () => {
    getSession.mockResolvedValue({ userId: "op1", roles: ["operator"], emailVerified: true });
    await cradle.mailOutbox!.send({ to: "ala@example.com", subject: "Starsza", text: "Bez linku" });
    await cradle.mailOutbox!.send({ to: "ola@example.com", subject: "Nowsza", text: `Potwierdź adres: ${SECRET_LINK}` });

    const response = await outbox.GET(outboxRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      { id: expect.any(String), to: "ola@example.com", subject: "Nowsza", text: `Potwierdź adres: ${SECRET_LINK}`, sentAt: "2026-10-21T09:00:00.000Z" },
      { id: expect.any(String), to: "ala@example.com", subject: "Starsza", text: "Bez linku", sentAt: "2026-10-21T08:00:00.000Z" },
    ]);
    expect(body.data.map((message: object) => Object.keys(message).sort())).toEqual([
      ["id", "sentAt", "subject", "text", "to"],
      ["id", "sentAt", "subject", "text", "to"],
    ]);
    expect(logLines.join("")).not.toContain("sekretny-token");
  });

  it("nieoczekiwany błąd loguje tylko trasę — bez adresata i treści", async () => {
    getSession.mockResolvedValue({ userId: "op1", roles: ["operator"], emailVerified: true });
    await cradle.mailOutbox!.send({ to: "ola@example.com", subject: "Link", text: SECRET_LINK });
    vi.spyOn(cradle.mailOutbox!, "list").mockImplementation(() => {
      throw new Error("awaria");
    });

    const response = await outbox.GET(outboxRequest(), context);

    expect(response.status).toBe(500);
    const logs = logLines.join("");
    expect(logs).toContain("GET /api/mail/outbox");
    expect(logs).not.toContain("sekretny-token");
    expect(logs).not.toContain("ola@example.com");
  });
});
