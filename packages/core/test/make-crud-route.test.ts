import { beforeEach, describe, expect, it, vi } from "vitest";

const technologyService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../src/container/container", () => ({
  withScope: (work: (cradle: unknown) => Promise<unknown>) => work({ technologyService }),
}));

const { makeCrudRoute, REQUEST_MARKER_HEADER } = await import("../src");
const { technologyCreateSchema } = await import("../src/validators/mentors/technology-create.schema");
const { technologyUpdateSchema } = await import("../src/validators/mentors/technology-update.schema");

const context = { params: Promise.resolve({}) };
const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";

function request(method: string, path = "/api/technologies", body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", [REQUEST_MARKER_HEADER]: "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("makeCrudRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("domyślnie wymaga sesji dla każdej operacji (fail closed)", async () => {
    const routes = makeCrudRoute({
      service: "technologyService",
      createSchema: technologyCreateSchema,
      updateSchema: technologyUpdateSchema,
    });

    const response = await routes.GET(request("GET"), context);

    expect(response.status).toBe(401);
    expect(technologyService.list).not.toHaveBeenCalled();
  });

  it("publiczny odczyt zwraca listę z serwisu", async () => {
    technologyService.list.mockResolvedValue([{ id: ID, name: "Go" }]);
    const routes = makeCrudRoute({
      service: "technologyService",
      createSchema: technologyCreateSchema,
      updateSchema: technologyUpdateSchema,
      access: { read: "public" },
    });

    const response = await routes.GET(request("GET"), context);

    expect(await response.json()).toEqual({ ok: true, data: [{ id: ID, name: "Go" }] });
  });

  it("przekazuje do serwisu wyłącznie sparsowany kształt i odpowiada 201", async () => {
    technologyService.create.mockImplementation(async (input) => ({ id: ID, ...input }));
    const routes = makeCrudRoute({
      service: "technologyService",
      createSchema: technologyCreateSchema,
      updateSchema: technologyUpdateSchema,
      access: { read: "public", write: async () => undefined },
    });

    const response = await routes.POST(request("POST", "/api/technologies", { name: "Go", slug: "go", id: "x" }), context);

    expect(response.status).toBe(201);
    expect(technologyService.create).toHaveBeenCalledWith({ name: "Go", slug: "go" });
  });

  it("DELETE usuwa rekord i zwraca jego ID", async () => {
    technologyService.delete.mockResolvedValue(undefined);
    const routes = makeCrudRoute({
      service: "technologyService",
      createSchema: technologyCreateSchema,
      updateSchema: technologyUpdateSchema,
      access: { read: "public", write: async () => undefined },
    });

    const response = await routes.DELETE(request("DELETE", `/api/technologies?id=${ID}`), context);

    expect(await response.json()).toEqual({ ok: true, data: { id: ID } });
    expect(technologyService.delete).toHaveBeenCalledWith(ID);
  });

  it("PUT i DELETE wymagają poprawnego ?id=", async () => {
    technologyService.update.mockResolvedValue({ id: ID, name: "Golang" });
    const routes = makeCrudRoute({
      service: "technologyService",
      createSchema: technologyCreateSchema,
      updateSchema: technologyUpdateSchema,
      access: { read: "public", write: async () => undefined },
    });

    const missingId = await routes.DELETE(request("DELETE"), context);
    const updated = await routes.PUT(request("PUT", `/api/technologies?id=${ID}`, { name: "Golang" }), context);

    expect(missingId.status).toBe(400);
    expect(technologyService.delete).not.toHaveBeenCalled();
    expect(updated.status).toBe(200);
    expect(technologyService.update).toHaveBeenCalledWith(ID, { name: "Golang" });
  });
});
