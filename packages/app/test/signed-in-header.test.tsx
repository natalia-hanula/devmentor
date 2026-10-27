import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const pathname = vi.hoisted(() => ({ current: "/account" }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => pathname.current }));

const { SignedInHeader } = await import("../app/_lib/signed-in-header");
const { NavLink } = await import("../app/_lib/nav-link");

const account = (roles: string[], displayName = "Ola") => ({ ok: true, data: { displayName, roles } });

function navLinks() {
  return within(screen.getByRole("navigation", { name: "Konto" }))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("SignedInHeader (e01, L21)", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
    pathname.current = "/account";
  });

  it("do czasu odpowiedzi pokazuje tylko nazwę serwisu; dane z GET /api/auth/me", async () => {
    apiCall.mockResolvedValue(account(["mentee"]));

    render(<SignedInHeader />);

    expect(screen.getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(await screen.findByText("Ola")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("mentee: tylko „Konto”, nazwa i „Wyloguj” — bez linków do panelu mentora i operatora", async () => {
    apiCall.mockResolvedValue(account(["mentee"]));

    render(<SignedInHeader />);
    await screen.findByText("Ola");

    expect(navLinks()).toEqual([["Konto", "/account"]]);
    expect(screen.getByRole("button", { name: "Wyloguj" })).toBeInTheDocument();
  });

  it("mentor: „Konto” i „Panel mentora” (bez panelu operatora)", async () => {
    apiCall.mockResolvedValue(account(["mentee", "mentor"], "Ewa"));

    render(<SignedInHeader />);
    await screen.findByText("Ewa");

    expect(navLinks()).toEqual([
      ["Konto", "/account"],
      ["Panel mentora", "/mentor"],
    ]);
  });

  it("operator: „Konto” i „Panel operatora” → /admin/invitations (bez panelu mentora)", async () => {
    apiCall.mockResolvedValue(account(["operator"], "Admin"));

    render(<SignedInHeader />);
    await screen.findByText("Admin");

    expect(navLinks()).toEqual([
      ["Konto", "/account"],
      ["Panel operatora", "/admin/invitations"],
    ]);
  });

  it("aktywna pozycja: /account → „Konto”, /mentor → „Panel mentora”, każda podstrona /admin/* → „Panel operatora”", async () => {
    apiCall.mockResolvedValue(account(["mentee", "mentor", "operator"]));

    pathname.current = "/mentor";
    const { unmount } = render(<SignedInHeader />);
    await screen.findByText("Ola");
    expect(screen.getByRole("link", { name: "Panel mentora" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Konto" })).not.toHaveAttribute("aria-current");
    unmount();

    pathname.current = "/admin/technologies";
    render(<SignedInHeader />);
    await screen.findByText("Ola");
    expect(screen.getByRole("link", { name: "Panel operatora" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Panel mentora" })).not.toHaveAttribute("aria-current");
  });

  it("„Wyloguj” → POST /api/auth/logout i /login z „Wylogowano” (L04)", async () => {
    apiCall.mockImplementation(async (path: string) => (path === "/api/auth/me" ? account(["mentee"]) : { ok: true, data: null }));

    render(<SignedInHeader />);
    await userEvent.click(await screen.findByRole("button", { name: "Wyloguj" }));

    expect(apiCall).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?notice=logged_out"));
  });

  it("błąd (503) → sama nazwa serwisu, bez nawigacji i bez komunikatu (błąd pokazuje strona pod spodem)", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } });

    render(<SignedInHeader />);
    await vi.waitFor(() => expect(apiCall).toHaveBeenCalled());
    await Promise.resolve();

    expect(screen.getByRole("link", { name: "DevMentor" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("401 → /login z „Sesja wygasła” i powrotem na bieżącą stronę", async () => {
    pathname.current = "/mentor";
    apiCall.mockResolvedValue({ ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } });

    render(<SignedInHeader />);

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fmentor&notice=session_expired"));
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("przerywa ładowanie przy odmontowaniu i nie ustawia stanu po przerwaniu", async () => {
    let finish!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const { unmount } = render(<SignedInHeader />);
    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    unmount();
    finish(account(["mentee"]));

    expect(options.signal.aborted).toBe(true);
    await Promise.resolve();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("NavLink", () => {
  it("aktywny tylko dla swojej ścieżki; podstrony zaznaczają go dopiero z activePrefix (niezależnie od href)", () => {
    pathname.current = "/admin/outbox";

    render(
      <>
        <NavLink href="/admin">Przegląd</NavLink>
        <NavLink href="/admin/invitations" activePrefix="/admin">
          Panel
        </NavLink>
        <NavLink href="/administracja" activePrefix="/admin">
          Podobna ścieżka
        </NavLink>
      </>,
    );

    expect(screen.getByRole("link", { name: "Przegląd" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Panel" })).toHaveAttribute("aria-current", "page");
    // `activePrefix` działa niezależnie od `href`: pozycja prowadzi gdzie indziej, ale zaznacza się na całym `/admin/*`.
    expect(screen.getByRole("link", { name: "Podobna ścieżka" })).toHaveAttribute("aria-current", "page");
  });

  it("prefiks dopasowuje samą ścieżkę prefiksu, ale nie ścieżki o podobnym początku", () => {
    pathname.current = "/administracja";

    render(
      <NavLink href="/admin/invitations" activePrefix="/admin">
        Panel
      </NavLink>,
    );

    expect(screen.getByRole("link", { name: "Panel" })).not.toHaveAttribute("aria-current");

    pathname.current = "/admin";
    render(
      <NavLink href="/admin/invitations" activePrefix="/admin">
        Panel 2
      </NavLink>,
    );
    expect(screen.getByRole("link", { name: "Panel 2" })).toHaveAttribute("aria-current", "page");
  });
});
