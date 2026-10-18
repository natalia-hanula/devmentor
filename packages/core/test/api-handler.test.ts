import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  apiHandler,
  ConflictError,
  NotFoundError,
  parseJsonBody,
  REQUEST_MARKER_HEADER,
  type RouteContext,
} from "../src";

const context: RouteContext = { params: Promise.resolve({}) };

function request(method: string, { marker = true, body }: { marker?: boolean; body?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (marker) headers.set(REQUEST_MARKER_HEADER, "1");
  return new Request("http://localhost/api/test", { method, headers, body });
}

describe("apiHandler", () => {
  it("opakowuje wynik w kopertę { ok: true, data }", async () => {
    const handler = apiHandler(async () => ({ hello: "world" }));

    const response = await handler(request("GET"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("zamienia AppError na status i kopertę błędu", async () => {
    const notFound = apiHandler(async () => {
      throw new NotFoundError("Brak");
    });
    const conflict = apiHandler(async () => {
      throw new ConflictError();
    });

    const notFoundResponse = await notFound(request("GET"), context);
    const conflictResponse = await conflict(request("GET"), context);

    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "Brak" } });
    expect(conflictResponse.status).toBe(409);
  });

  it("nieoczekiwany błąd → ogólny 500 bez szczegółów", async () => {
    const handler = apiHandler(async () => {
      throw new Error("connection string postgresql://user:tajne@db");
    });

    const response = await handler(request("GET"), context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: { code: "INTERNAL_ERROR", message: "Wystąpił nieoczekiwany błąd" } });
    expect(JSON.stringify(body)).not.toContain("tajne");
  });

  it("odrzuca żądanie zmieniające stan bez nagłówka aplikacji (CSRF) i nie wywołuje handlera", async () => {
    let called = false;
    const handler = apiHandler(async () => {
      called = true;
      return null;
    });

    const response = await handler(request("POST", { marker: false }), context);

    expect(response.status).toBe(403);
    expect(called).toBe(false);
  });

  it("zwraca 400 z fieldErrors dla błędnych danych i dla niepoprawnego JSON-a", async () => {
    const schema = z.object({ name: z.string().min(1, "Wymagane") });
    const handler = apiHandler(async (req) => parseJsonBody(req, schema));

    const invalid = await handler(request("POST", { body: JSON.stringify({ name: "" }) }), context);
    const malformed = await handler(request("POST", { body: "{nie json" }), context);

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Nieprawidłowe dane", fieldErrors: { name: ["Wymagane"] } },
    });
    expect(malformed.status).toBe(400);
  });

  it("używa successStatus przy sukcesie", async () => {
    const handler = apiHandler(async () => ({ id: 1 }), { successStatus: 201 });

    expect((await handler(request("POST"), context)).status).toBe(201);
  });
});

describe("apiHandler przy niedostępnej bazie", () => {
  it("zamienia błąd połączenia z bazą na 503 SERVICE_UNAVAILABLE", async () => {
    const { initOrm, Technology } = await import("@devmentor/db");
    const orm = await initOrm("postgresql://devmentor:devmentor@127.0.0.1:1/devmentor");
    const handler = apiHandler(async () => orm.em.fork().find(Technology, {}));

    try {
      const response = await handler(request("GET"), context);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        ok: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" },
      });
    } finally {
      await orm.close(true);
    }
  });
});
