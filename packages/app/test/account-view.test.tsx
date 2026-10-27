import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/account" }));

const { AccountView } = await import("../app/(mentee)/account/account-view");

const ACCOUNT = { id: "u1", email: "ola@example.com", displayName: "Ola", roles: ["mentee"], emailVerified: false, hasPassword: true };

describe("AccountView (s04)", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("ładowanie → dane konta z GET /api/auth/me", async () => {
    apiCall.mockResolvedValue({ ok: true, data: ACCOUNT });

    render(<AccountView />);
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie konta…");

    expect(await screen.findByText("ola@example.com")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByText("Ola")).toBeInTheDocument();
    expect(screen.getByText("mentee")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("niepotwierdzony")).toHaveAttribute("data-variant", "outline");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mentor: obie role i potwierdzony adres", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ...ACCOUNT, roles: ["mentee", "mentor"], emailVerified: true } });

    render(<AccountView />);

    expect(await screen.findByText("mentor")).toBeInTheDocument();
    expect(screen.getByText("mentee")).toBeInTheDocument();
    expect(screen.getByText("potwierdzony")).toHaveAttribute("data-variant", "default");
  });

  it("operator: ten sam widok tylko do odczytu — bez pól edycji i linku do hasła (L06)", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ...ACCOUNT, roles: ["operator"], emailVerified: true } });

    render(<AccountView />);

    expect(await screen.findByText("operator")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wyloguj" })).toBeInTheDocument();
  });

  it("błąd (503) → komunikat z ponowieniem", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce({ ok: true, data: ACCOUNT });

    render(<AccountView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się wczytać konta");
    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByText("ola@example.com")).toBeInTheDocument();
    expect(apiCall).toHaveBeenLastCalledWith("/api/auth/me");
  });

  it("401 → /login?next=/account&notice=session_expired, bez komunikatu błędu", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } });

    render(<AccountView />);

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Faccount&notice=session_expired"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie konta…");
  });

  it("„Wyloguj” → POST /api/auth/logout i /login?notice=logged_out", async () => {
    apiCall.mockImplementation(async (path: string) => (path === "/api/auth/me" ? { ok: true, data: ACCOUNT } : { ok: true, data: null }));

    render(<AccountView />);
    await screen.findByText("ola@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Wyloguj" }));

    expect(apiCall).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(router.replace).toHaveBeenCalledWith("/login?notice=logged_out");
  });

  it("odmontowanie przerywa ładowanie i ignoruje spóźnioną odpowiedź", async () => {
    let resolve!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((done) => (resolve = done)));

    const { unmount } = render(<AccountView />);
    unmount();
    resolve({ ok: false, error: { code: "UNAUTHORIZED", message: "x" } });
    await Promise.resolve();

    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    expect(options.signal.aborted).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  describe("baner niepotwierdzonego adresu (s04.3, s04.4)", () => {
    const banner = () => screen.getByRole("region", { name: "Potwierdzenie adresu e-mail" });

    it("niepotwierdzony → baner z „Wyślij ponownie”, bez „Zmień adres” (etap B)", async () => {
      apiCall.mockResolvedValue({ ok: true, data: ACCOUNT });

      render(<AccountView />);

      await screen.findByText("ola@example.com");
      expect(banner()).toHaveTextContent("Potwierdź adres e-mail — będzie potrzebny przed pierwszą rezerwacją");
      expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Zmień adres/ })).not.toBeInTheDocument();
    });

    it("potwierdzony → bez banera", async () => {
      apiCall.mockResolvedValue({ ok: true, data: { ...ACCOUNT, emailVerified: true } });

      render(<AccountView />);

      await screen.findByText("ola@example.com");
      expect(screen.queryByRole("region", { name: "Potwierdzenie adresu e-mail" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Wyślij ponownie" })).not.toBeInTheDocument();
    });

    it("„Wyślij ponownie” → POST resend, „Wysyłanie…” w trakcie, potem potwierdzenie", async () => {
      let resolveResend!: (value: unknown) => void;
      apiCall.mockImplementation((path: string) =>
        path === "/api/auth/me" ? Promise.resolve({ ok: true, data: ACCOUNT }) : new Promise((done) => (resolveResend = done)),
      );
      render(<AccountView />);
      await screen.findByText("ola@example.com");

      await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));
      expect(screen.getByRole("button", { name: "Wysyłanie…" })).toBeDisabled();
      resolveResend({ ok: true, data: { status: "sent" } });

      expect(await screen.findByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).toHaveAttribute("role", "status");
      expect(apiCall).toHaveBeenCalledWith("/api/auth/email-verification/resend", { method: "POST" });
      expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeEnabled();
    });

    it("wynik mail_failed → błąd „Nie udało się wysłać linku”, bez obietnicy wysyłki", async () => {
      apiCall.mockImplementation(async (path: string) =>
        path === "/api/auth/me" ? { ok: true, data: ACCOUNT } : { ok: true, data: { status: "mail_failed" } },
      );
      render(<AccountView />);
      await screen.findByText("ola@example.com");

      await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));

      expect(await screen.findByText("Nie udało się wysłać linku")).toBeInTheDocument();
      expect(screen.getByText("Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.")).toBeInTheDocument();
      expect(screen.queryByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeEnabled();
    });

    it.each([
      ["already_verified", "Adres jest już potwierdzony."],
      ["mail_disabled", "Wysyłka poczty jest wyłączona."],
    ])("wynik %s → komunikat „%s” zamiast obietnicy wysyłki", async (status, text) => {
      apiCall.mockImplementation(async (path: string) =>
        path === "/api/auth/me" ? { ok: true, data: ACCOUNT } : { ok: true, data: { status } },
      );
      render(<AccountView />);
      await screen.findByText("ola@example.com");

      await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));

      expect(await screen.findByText(text)).toHaveAttribute("role", "status");
      expect(screen.queryByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeEnabled();
    });

    it("429 → komunikat z serwera, przycisk znowu aktywny", async () => {
      apiCall.mockImplementation(async (path: string) =>
        path === "/api/auth/me"
          ? { ok: true, data: ACCOUNT }
          : { ok: false, error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." } },
      );
      render(<AccountView />);
      await screen.findByText("ola@example.com");

      await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Nie udało się wysłać linku");
      expect(alert).toHaveTextContent("Za dużo prób. Spróbuj za chwilę.");
      expect(screen.queryByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeEnabled();
    });

    it("401 przy wysyłce → „Sesja wygasła”, bez komunikatu błędu", async () => {
      apiCall.mockImplementation(async (path: string) =>
        path === "/api/auth/me" ? { ok: true, data: ACCOUNT } : { ok: false, error: { code: "UNAUTHORIZED", message: "x" } },
      );
      render(<AccountView />);
      await screen.findByText("ola@example.com");

      await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));

      await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Faccount&notice=session_expired"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
