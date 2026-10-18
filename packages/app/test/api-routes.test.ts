import { beforeEach, describe, expect, it, vi } from "vitest";

const cradle = {
  databaseHealthService: { check: vi.fn() },
  technologyService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

// Podmieniamy kontener DI (bez bazy) — trasy korzystają z prawdziwych apiHandler/makeCrudRoute.
vi.mock("../../core/src/container/container", () => ({
  withScope: (work: (c: typeof cradle) => Promise<unknown>) => work(cradle),
}));

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

describe("/api/technologies", () => {
  it("udostępnia publiczny odczyt listy", async () => {
    cradle.technologyService.list.mockResolvedValue([{ id: "1", name: "Go" }]);

    const response = await technologies.GET(new Request("http://localhost/api/technologies"), context);

    expect(await response.json()).toEqual({ ok: true, data: [{ id: "1", name: "Go" }] });
  });

  it("wymaga sesji przy zapisie (fail closed)", async () => {
    const request = (method: string) =>
      new Request("http://localhost/api/technologies?id=6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b", {
        method,
        headers: { "x-devmentor-request": "1", "content-type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify({ name: "Go", slug: "go" }),
      });

    const writes = [
      ["POST", technologies.POST],
      ["PUT", technologies.PUT],
      ["DELETE", technologies.DELETE],
    ] as const;
    for (const [method, handler] of writes) {
      expect((await handler(request(method), context)).status).toBe(401);
    }
    expect(cradle.technologyService.create).not.toHaveBeenCalled();
  });
});
