import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionFromCookieValue = vi.hoisted(() => vi.fn());
const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((location: string): never => {
    throw new Error(`NEXT_REDIRECT ${location}`);
  }),
);
const connection = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@devmentor/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/core")>()),
  getSessionFromCookieValue,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection }));

const { PageRoleGate, requirePageRole, RoleGate } = await import("../app/_lib/require-page-role");

const session = (roles: string[]) => ({ userId: "u1", roles, emailVerified: true });

describe("requirePageRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: "jwt" });
  });

  it("zaczyna od connection() i czyta ciasteczko sesji", async () => {
    getSessionFromCookieValue.mockResolvedValue(session(["operator"]));

    await requirePageRole("operator", "/admin");

    expect(connection).toHaveBeenCalled();
    expect(cookieStore.get).toHaveBeenCalledWith("devmentor_session");
    expect(getSessionFromCookieValue).toHaveBeenCalledWith("jwt");
  });

  it("sesja z wymaganą rolą → null (strona się renderuje)", async () => {
    getSessionFromCookieValue.mockResolvedValue(session(["mentee", "operator"]));

    expect(await requirePageRole("operator", "/admin")).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("brak sesji → przekierowanie na /login z zakodowanym next", async () => {
    getSessionFromCookieValue.mockResolvedValue(null);

    await expect(requirePageRole("operator", "/admin/technologies?x=1")).rejects.toThrow(
      "NEXT_REDIRECT /login?next=%2Fadmin%2Ftechnologies%3Fx%3D1",
    );
  });

  it("brak ciasteczka → przekierowanie, bez sesji", async () => {
    cookieStore.get.mockReturnValue(undefined);
    getSessionFromCookieValue.mockResolvedValue(null);

    await expect(requirePageRole("mentor", "/mentor")).rejects.toThrow("NEXT_REDIRECT /login?next=%2Fmentor");
    expect(getSessionFromCookieValue).toHaveBeenCalledWith(undefined);
  });

  it("złośliwa ścieżka docelowa nie trafia do next (safeNextPath)", async () => {
    getSessionFromCookieValue.mockResolvedValue(null);

    await expect(requirePageRole("operator", "//evil.pl")).rejects.toThrow("NEXT_REDIRECT /login?next=%2F");
  });

  it.each([
    ["operator", ["mentee"], "Ta strona wymaga roli operatora."],
    ["operator", ["mentee", "mentor"], "Ta strona wymaga roli operatora."],
    ["mentor", ["operator"], "Ta strona wymaga roli mentora."],
    ["mentee", ["operator"], "Ta strona wymaga roli mentee."],
  ] as const)("rola %s a sesja %j → widok „Brak dostępu”", async (role, roles, sentence) => {
    getSessionFromCookieValue.mockResolvedValue(session([...roles]));

    const denied = await requirePageRole(role, "/x");
    render(denied);

    expect(screen.getByRole("alert")).toHaveTextContent("Nie masz dostępu do tej strony");
    expect(screen.getByRole("alert")).toHaveTextContent(sentence);
  });
});

describe("RoleGate / PageRoleGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: "jwt" });
  });

  it("z uprawnieniem renderuje dzieci", async () => {
    getSessionFromCookieValue.mockResolvedValue(session(["operator"]));

    render(await RoleGate({ role: "operator", path: "/admin", children: <p>treść panelu</p> }));

    expect(screen.getByText("treść panelu")).toBeInTheDocument();
  });

  it("bez uprawnienia renderuje „Brak dostępu” zamiast dzieci", async () => {
    getSessionFromCookieValue.mockResolvedValue(session(["mentee"]));

    render(await RoleGate({ role: "operator", path: "/admin", children: <p>treść panelu</p> }));

    expect(screen.queryByText("treść panelu")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Nie masz dostępu do tej strony");
  });

  it("PageRoleGate owija bramkę w Suspense z komunikatem ładowania", () => {
    const gate = PageRoleGate({ role: "operator", path: "/admin", children: <p>x</p> });

    render(gate.props.fallback);

    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie…");
    expect(gate.props.children.type).toBe(RoleGate);
    expect(gate.props.children.props).toMatchObject({ role: "operator", path: "/admin" });
  });
});
