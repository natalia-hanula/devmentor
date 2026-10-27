import { afterEach, describe, expect, it, vi } from "vitest";
import { apiCall, apiCallOrThrow, ApiCallError } from "../src/backend/api/api-call";

function mockFetch(response: Response | Error | DOMException) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error || response instanceof DOMException) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiCall", () => {
  it("wysyła nagłówek aplikacji i body JSON, zwraca kopertę z serwera", async () => {
    const fetchMock = mockFetch(Response.json({ ok: true, data: { id: "1" } }, { status: 201 }));

    const result = await apiCall<{ id: string }>("/api/technologies", { method: "POST", body: { name: "Go" } });

    expect(result).toEqual({ ok: true, data: { id: "1" } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ "x-devmentor-request": "1", "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ name: "Go" }));
  });

  it("przekazuje błąd z koperty, łącznie z fieldErrors", async () => {
    const error = { code: "VALIDATION_ERROR", message: "Nieprawidłowe dane", fieldErrors: { slug: ["Zły slug"] } };
    mockFetch(Response.json({ ok: false, error }, { status: 400 }));

    expect(await apiCall("/api/technologies")).toEqual({ ok: false, error });
  });

  it("429 z kopertą przekazuje kod TOO_MANY_REQUESTS i komunikat z serwera", async () => {
    const error = { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." };
    mockFetch(Response.json({ ok: false, error }, { status: 429 }));

    expect(await apiCall("/api/auth/login", { method: "POST", body: {} })).toEqual({ ok: false, error });
  });

  it("429 bez poprawnej koperty (np. limit na proxy) → TOO_MANY_REQUESTS z ogólnym komunikatem", async () => {
    mockFetch(new Response("Too Many Requests", { status: 429 }));

    const result = await apiCall("/api/auth/login", { method: "POST", body: {} });

    expect(result).toEqual({
      ok: false,
      error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." },
    });
  });

  it("nie wywraca się na odpowiedzi, która nie jest JSON-em (np. strona błędu proxy)", async () => {
    mockFetch(new Response("<html>502</html>", { status: 502 }));

    const result = await apiCall("/api/technologies");

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_RESPONSE", message: "Nieoczekiwana odpowiedź serwera (HTTP 502)" },
    });
  });

  it("zgłasza NETWORK_ERROR, gdy fetch się nie powiedzie", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    const result = await apiCall("/api/health");

    expect(result.ok === false && result.error.code).toBe("NETWORK_ERROR");
  });

  it("odmawia ścieżek spoza /api/* bez wywołania fetch", async () => {
    const fetchMock = mockFetch(Response.json({ ok: true, data: null }));

    const result = await apiCall("https://evil.example/api/x");

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("apiCallOrThrow", () => {
  it("zwraca data albo rzuca ApiCallError z kodem błędu", async () => {
    mockFetch(Response.json({ ok: true, data: [1, 2] }));
    expect(await apiCallOrThrow<number[]>("/api/x")).toEqual([1, 2]);

    mockFetch(Response.json({ ok: false, error: { code: "NOT_FOUND", message: "Brak" } }, { status: 404 }));
    await expect(apiCallOrThrow("/api/x")).rejects.toBeInstanceOf(ApiCallError);
  });
});

describe("apiCall — przypadki brzegowe", () => {
  it("zgłasza ABORTED, gdy żądanie przerwano sygnałem", async () => {
    mockFetch(new DOMException("aborted", "AbortError"));

    const result = await apiCall("/api/x", { signal: new AbortController().signal });

    expect(result.ok === false && result.error.code).toBe("ABORTED");
  });

  it("traktuje pustą odpowiedź i nieczytelne body jako INVALID_RESPONSE", async () => {
    mockFetch(new Response(null, { status: 204 }));
    expect((await apiCall("/api/x")).ok).toBe(false);

    const unreadable = { status: 500, text: () => Promise.reject(new Error("stream error")) } as unknown as Response;
    mockFetch(unreadable);
    const result = await apiCall("/api/x");
    expect(result.ok === false && result.error.code).toBe("INVALID_RESPONSE");
  });

  it.each([
    ["obiekt bez ok", { data: 1 }],
    ["ok: true bez data", { ok: true }],
    ["ok inne niż boolean", { ok: "tak", error: { code: "X", message: "Y" } }],
    ["ok: false bez error", { ok: false }],
    ["error nie jest obiektem", { ok: false, error: "zły" }],
    ["error bez code/message", { ok: false, error: { code: "X" } }],
    ["null", null],
  ])("odrzuca odpowiedź, która nie jest kopertą API: %s", async (_label, payload) => {
    mockFetch(Response.json(payload));

    const result = await apiCall("/api/x");

    expect(result.ok === false && result.error.code).toBe("INVALID_RESPONSE");
  });
});
