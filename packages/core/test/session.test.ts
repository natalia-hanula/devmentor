import { beforeEach, describe, expect, it, vi } from "vitest";

const em = { findOne: vi.fn() };
const tokenService = { verify: vi.fn() };
const withScope = vi.fn((work: (cradle: unknown) => Promise<unknown>) =>
  work({ em, sessionTokenService: tokenService }),
);
vi.mock("../src/container/container", () => ({ withScope }));

const { getSession, getSessionFromCookieValue, SESSION_COOKIE_NAME } = await import("../src");

const USER_ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const userWith = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  sessionVersion: 2,
  emailVerifiedAt: new Date("2026-10-20T10:00:00Z"),
  roles: { getItems: () => [{ role: "mentee" }, { role: "mentor" }] },
  ...overrides,
});
const requestWithCookie = (cookie?: string) =>
  new Request("http://localhost/api/x", { headers: cookie ? { cookie } : {} });

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.verify.mockResolvedValue({ userId: USER_ID, sessionVersion: 2 });
    em.findOne.mockResolvedValue(userWith());
  });

  it("bez ciasteczka zwraca null i nie dotyka kontenera ani bazy", async () => {
    expect(await getSession(requestWithCookie())).toBeNull();
    expect(await getSession(requestWithCookie("inne=1; kolejne"))).toBeNull();
    expect(withScope).not.toHaveBeenCalled();
  });

  it("znajduje ciasteczko sesji wśród innych i zwraca role oraz stan e-maila z bazy", async () => {
    const session = await getSession(requestWithCookie(`a=1; ${SESSION_COOKIE_NAME}=jwt-token ; b=2`));

    expect(tokenService.verify).toHaveBeenCalledWith("jwt-token");
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { id: USER_ID }, { populate: ["roles"] });
    expect(session).toEqual({ userId: USER_ID, roles: ["mentee", "mentor"], emailVerified: true });
  });

  it("konto z niepotwierdzonym adresem ma emailVerified = false", async () => {
    em.findOne.mockResolvedValue(userWith({ emailVerifiedAt: null }));

    expect((await getSessionFromCookieValue("jwt"))?.emailVerified).toBe(false);
  });

  it("nieważny token → null, bez zapytania o użytkownika", async () => {
    tokenService.verify.mockResolvedValue(null);

    expect(await getSessionFromCookieValue("zly")).toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it("konto usunięte z bazy → null", async () => {
    em.findOne.mockResolvedValue(null);

    expect(await getSessionFromCookieValue("jwt")).toBeNull();
  });

  it("inna wersja sesji niż w bazie (np. po resecie hasła) → null", async () => {
    em.findOne.mockResolvedValue(userWith({ sessionVersion: 3 }));

    expect(await getSessionFromCookieValue("jwt")).toBeNull();
  });

  it.each([[null], [undefined], [""]])("brak wartości ciasteczka (%j) → null bez kontenera", async (value) => {
    expect(await getSessionFromCookieValue(value)).toBeNull();
    expect(withScope).not.toHaveBeenCalled();
  });

  it("błąd bazy leci dalej zamiast uchodzić za brak sesji albo zalogowanie (503 w apiHandler)", async () => {
    em.findOne.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getSessionFromCookieValue("jwt")).rejects.toThrow("ECONNREFUSED");
  });
});
