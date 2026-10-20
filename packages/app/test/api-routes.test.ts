import { beforeEach, describe, expect, it, vi } from "vitest";

const cradle = {
  databaseHealthService: { check: vi.fn() },
  technologyService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

// Podmieniamy kontener DI (bez bazy) — trasy korzystają z prawdziwych apiHandler/makeCrudRoute.
vi.mock("../../core/src/container/container", () => ({
  withScope: (work: (c: typeof cradle) => Promise<unknown>) => work(cradle),
}));

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../../core/src/http/session", () => ({ getSession }));

const health = await import("../app/api/health/route");
const technologies = await import("../app/api/technologies/route");

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
