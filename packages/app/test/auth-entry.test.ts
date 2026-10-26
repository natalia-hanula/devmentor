import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionFromCookieValue = vi.hoisted(() => vi.fn());
const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((location: string): never => {
    throw new Error(`NEXT_REDIRECT ${location}`);
  }),
);
const connection = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@devmentor/core", () => ({ getSessionFromCookieValue, SESSION_COOKIE_NAME: "devmentor_session" }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection }));

const { INVITE_PATH, readNext, redirectSignedIn, searchParam, withNext } = await import("../app/(auth)/auth-entry");

const session = (roles: string[]) => ({ userId: "u1", roles, emailVerified: true });

describe("parametry stron kont", () => {
  it("searchParam bierze tylko pojedynczą wartość", () => {
    expect(searchParam({ notice: "logged_out" }, "notice")).toBe("logged_out");
    expect(searchParam({ notice: ["a", "b"] }, "notice")).toBeUndefined();
    expect(searchParam({}, "notice")).toBeUndefined();
  });

  it("readNext: brak → undefined, bezpieczny zostaje, złośliwy → /", () => {
    expect(readNext({})).toBeUndefined();
    expect(readNext({ next: "/invite" })).toBe(INVITE_PATH);
    expect(readNext({ next: "//evil.example" })).toBe("/");
    expect(readNext({ next: "https://evil.example" })).toBe("/");
  });

  it("withNext przenosi next zakodowany, bez next zostawia goły adres", () => {
    expect(withNext("/register", "/admin?x=1")).toBe("/register?next=%2Fadmin%3Fx%3D1");
    expect(withNext("/login", undefined)).toBe("/login");
  });
});

describe("redirectSignedIn (L05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: "jwt" });
  });

  it("gość → bez przekierowania (connection i ciasteczko sprawdzone)", async () => {
    getSessionFromCookieValue.mockResolvedValue(null);

    await expect(redirectSignedIn("/admin")).resolves.toBeUndefined();
    expect(connection).toHaveBeenCalled();
    expect(getSessionFromCookieValue).toHaveBeenCalledWith("jwt");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("brak ciasteczka → sesja z undefined, bez przekierowania", async () => {
    cookieStore.get.mockReturnValue(undefined);
    getSessionFromCookieValue.mockResolvedValue(null);

    await redirectSignedIn(undefined);
    expect(getSessionFromCookieValue).toHaveBeenCalledWith(undefined);
  });

  it("zalogowana osoba z next → next", async () => {
    getSessionFromCookieValue.mockResolvedValue(session(["mentee"]));

    await expect(redirectSignedIn("/invite")).rejects.toThrow("NEXT_REDIRECT /invite");
  });

  it.each([
    [["mentee"], "/account"],
    [["mentee", "mentor"], "/mentor"],
    [["operator"], "/admin/invitations"],
  ])("zalogowana osoba bez next, role %j → %s", async (roles, path) => {
    getSessionFromCookieValue.mockResolvedValue(session(roles));

    await expect(redirectSignedIn(undefined)).rejects.toThrow(`NEXT_REDIRECT ${path}`);
  });
});
