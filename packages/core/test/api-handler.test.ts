import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  apiHandler,
  ConflictError,
  NotFoundError,
  parseJsonBody,
  REQUEST_MARKER_HEADER,
  TooManyRequestsError,
  withCookies,
  type RouteContext,
} from "../src";
import { isDataWithCookies, JSON_BODY_MAX_BYTES } from "../src/http/api-handler";

const context: RouteContext = { params: Promise.resolve({}) };

function request(method: string, { marker = true, body }: { marker?: boolean; body?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (marker) headers.set(REQUEST_MARKER_HEADER, "1");
  return new Request("http://localhost/api/test", { method, headers, body });
}

describe("apiHandler — ciasteczka (withCookies)", () => {
  it("dokleja każde ciasteczko jako osobny Set-Cookie i zachowuje kopertę oraz status", async () => {
    const handler = apiHandler(async () => withCookies({ id: "u1" }, ["a=1; Path=/", "b=2; Path=/"]), {
      successStatus: 201,
    });

    const response = await handler(request("POST"), context);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: { id: "u1" } });
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("zwykły wynik nie ustawia ciasteczek", async () => {
    const response = await apiHandler(async () => ({ id: "u1" }))(request("GET"), context);

    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("błąd handlera nie ustawia ciasteczek", async () => {
    const handler = apiHandler(async () => {
      throw new ConflictError("Zajęte");
    });

    const response = await handler(request("POST"), context);

    expect(response.status).toBe(409);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});

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
    expect(await conflictResponse.json()).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Konflikt z istniejącymi danymi" },
    });
  });

  it("ConflictError z fieldErrors → 409 z błędem przy polu", async () => {
    const handler = apiHandler(async () => {
      throw new ConflictError("Ten e-mail ma już konto", { email: ["Ten e-mail ma już konto"] });
    });

    const response = await handler(request("GET"), context);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Ten e-mail ma już konto", fieldErrors: { email: ["Ten e-mail ma już konto"] } },
    });
  });

  it("TooManyRequestsError → 429 z kopertą TOO_MANY_REQUESTS", async () => {
    const handler = apiHandler(async () => {
      throw new TooManyRequestsError();
    });

    const response = await handler(request("POST"), context);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." },
    });
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

  describe("limit rozmiaru body (parseJsonBody)", () => {
    const schema = z.object({ text: z.string() });
    const handlerWith = (maxBytes?: number) => apiHandler(async (req) => parseJsonBody(req, schema, maxBytes));
    const jsonOfSize = (bytes: number) => JSON.stringify({ text: "a".repeat(bytes - '{"text":""}'.length) });

    it("domyślny limit to 16 KiB: body równe limitowi przechodzi, o bajt większe → 413 PAYLOAD_TOO_LARGE", async () => {
      const handler = handlerWith();

      const atLimit = await handler(request("POST", { body: jsonOfSize(JSON_BODY_MAX_BYTES) }), context);
      const overLimit = await handler(request("POST", { body: jsonOfSize(JSON_BODY_MAX_BYTES + 1) }), context);

      expect(JSON_BODY_MAX_BYTES).toBe(16 * 1024);
      expect(atLimit.status).toBe(200);
      expect(overLimit.status).toBe(413);
      expect(await overLimit.json()).toEqual({
        ok: false,
        error: { code: "PAYLOAD_TOO_LARGE", message: "Treść żądania jest za duża" },
      });
    });

    it("limit liczy bajty UTF-8, nie znaki", async () => {
      const handler = handlerWith(64);
      const body = JSON.stringify({ text: "ą".repeat(30) });

      expect(body.length).toBeLessThan(64);
      expect((await handler(request("POST", { body }), context)).status).toBe(413);
    });

    it("deklarowany `content-length` ponad limit odrzuca bez czytania body", async () => {
      const req = request("POST", { body: JSON.stringify({ text: "x" }) });
      req.headers.set("content-length", String(JSON_BODY_MAX_BYTES + 1));

      expect((await handlerWith()(req, context)).status).toBe(413);
    });

    it("body bez `content-length` (strumień w kawałkach) przerywa czytanie po przekroczeniu limitu", async () => {
      let pulled = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulled += 1;
          controller.enqueue(new TextEncoder().encode("x".repeat(40)));
        },
      });
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-devmentor-request": "1" },
        body: stream,
        duplex: "half",
      } as RequestInit);

      expect((await handlerWith(100)(req, context)).status).toBe(413);
      expect(pulled).toBeLessThan(10);
    });

    it("body złożone z kilku kawałków mieszczące się w limicie jest składane i parsowane", async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('{"text":'));
          controller.enqueue(encoder.encode('"cześć"}'));
          controller.close();
        },
      });
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-devmentor-request": "1" },
        body: stream,
        duplex: "half",
      } as RequestInit);

      const response = await apiHandler(async (r) => parseJsonBody(r, schema))(req, context);

      expect(await response.json()).toEqual({ ok: true, data: { text: "cześć" } });
    });

    it("brak body → 400 „nie jest poprawnym JSON-em”", async () => {
      const response = await handlerWith()(request("POST"), context);

      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: { message: string } }).error.message).toBe("Treść żądania nie jest poprawnym JSON-em");
    });
  });

  describe("isDataWithCookies", () => {
    it("rozpoznaje wynik withCookies, także skopiowany do zwykłego obiektu (inna kopia modułu)", () => {
      const original = withCookies("x", ["a=1"]);

      expect(isDataWithCookies(original)).toBe(true);
      expect(isDataWithCookies(Object.assign({}, original))).toBe(true);
    });

    it.each<[string, unknown]>([
      ["napis", "x"],
      ["null", null],
      ["liczba", 1],
      ["obiekt z samymi polami data/cookies", { data: "x", cookies: ["a=1"] }],
    ])("nie bierze za wynik withCookies: %s", (_name, value) => {
      expect(isDataWithCookies(value)).toBe(false);
    });
  });

  it("błąd walidacji na poziomie całego obiektu trafia pod klucz _form", async () => {
    const handler = apiHandler(async (req) => parseJsonBody(req, z.object({ name: z.string() })));

    const response = await handler(request("POST", { body: JSON.stringify(42) }), context);
    const body = (await response.json()) as { error: { fieldErrors: Record<string, string[]> } };

    expect(response.status).toBe(400);
    expect(Object.keys(body.error.fieldErrors)).toEqual(["_form"]);
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
