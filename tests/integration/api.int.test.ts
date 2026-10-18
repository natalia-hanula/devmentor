import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
const SEEDED_TECHNOLOGIES = 8;

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("API działającej aplikacji", () => {
  it("GET /api/health potwierdza połączenie z bazą", async () => {
    const { status, body } = await call("/api/health");

    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: { ok: true, serverVersion: expect.stringMatching(/^17\./) } });
  });

  it("GET /api/technologies zwraca słownik z migracji posortowany po nazwie", async () => {
    const { body } = await call("/api/technologies");
    const names = (body.data as { name: string }[]).map((t) => t.name);

    expect(body.ok).toBe(true);
    expect(names).toHaveLength(SEEDED_TECHNOLOGIES);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("odrzuca zapis bez nagłówka aplikacji (CSRF) i bez sesji, nie zmieniając danych", async () => {
    const payload = JSON.stringify({ name: "Go", slug: "go" });

    const withoutMarker = await call("/api/technologies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
    const withoutSession = await call("/api/technologies", {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-request": "1" },
      body: payload,
    });
    const after = await call("/api/technologies");

    expect(withoutMarker).toMatchObject({ status: 403, body: { ok: false, error: { code: "FORBIDDEN" } } });
    expect(withoutSession).toMatchObject({ status: 401, body: { ok: false, error: { code: "UNAUTHORIZED" } } });
    expect(after.body.data).toHaveLength(SEEDED_TECHNOLOGIES);
  });
});
