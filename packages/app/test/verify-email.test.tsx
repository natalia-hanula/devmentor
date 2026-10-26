import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/verify-email" }));

const { VerifyEmailView } = await import("../app/(auth)/verify-email/verify-email-view");
const verifyEmailPage = await import("../app/(auth)/verify-email/page");

const TOKEN = "AbC_def-123456";
const MENTEE = { email: "a@example.com", roles: ["mentee"], emailVerified: false };
const GUEST = { ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } };
const INVALID = { ok: false, error: { code: "VALIDATION_ERROR", message: "Link jest nieważny albo wygasł" } };

interface Responses {
  me?: unknown;
  confirm?: unknown;
  resend?: unknown;
}

function respond({ me = GUEST, confirm, resend }: Responses) {
  apiCall.mockImplementation(async (path: string) => {
    if (path === "/api/auth/me") return me;
    if (path === "/api/auth/email-verification/confirm") return confirm;
    return resend;
  });
}

function signedIn(account: Partial<typeof MENTEE> = {}) {
  return { ok: true, data: { ...MENTEE, ...account } };
}

function confirmed(email = "a@example.com") {
  return { ok: true, data: { emailVerified: true, email } };
}

const confirmCalls = () => apiCall.mock.calls.filter(([path]) => path === "/api/auth/email-verification/confirm");

describe("VerifyEmailPage", () => {
  it("karta z tytułem i widokiem klienckim, metadata", async () => {
    window.history.replaceState(null, "", "/verify-email");
    respond({});
    const page = verifyEmailPage.default();

    expect(verifyEmailPage.metadata.title).toBe("Potwierdzenie adresu e-mail — DevMentor");
    render(page);
    expect(screen.getByRole("heading", { level: 1, name: "Potwierdzenie adresu e-mail" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
  });
});

describe("VerifyEmailView (s05)", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
    window.history.replaceState(null, "", `/verify-email#token=${TOKEN}`);
    replaceState = vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceState.mockRestore();
    window.history.replaceState(null, "", "/");
  });

  it("s05.1: ładowanie, token od razu usunięty z adresu (replaceState), potem POST z tokenem w treści", async () => {
    respond({ confirm: confirmed() });

    render(<VerifyEmailView />);

    expect(screen.getByRole("status")).toHaveTextContent("Potwierdzanie adresu…");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/verify-email");
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(TOKEN);
    expect(apiCall).toHaveBeenCalledWith("/api/auth/email-verification/confirm", { method: "POST", body: { token: TOKEN } });
    expect(apiCall).toHaveBeenCalledWith("/api/auth/me");
    await screen.findByText("Adres e-mail potwierdzony");
  });

  it("query zostaje, znika tylko fragment", async () => {
    window.history.replaceState(null, "", `/verify-email?utm=x#token=${TOKEN}`);
    respond({ confirm: confirmed() });

    render(<VerifyEmailView />);

    expect(window.location.search).toBe("?utm=x");
    expect(window.location.hash).toBe("");
    await screen.findByText("Adres e-mail potwierdzony");
  });

  it("Strict Mode (podwójny efekt) → jeden POST potwierdzenia", async () => {
    respond({ confirm: confirmed() });

    render(
      <StrictMode>
        <VerifyEmailView />
      </StrictMode>,
    );

    await screen.findByText("Adres e-mail potwierdzony");
    expect(confirmCalls()).toHaveLength(1);
  });

  it("s05.2 gość: sukces i „Zaloguj się”", async () => {
    respond({ confirm: confirmed() });

    render(<VerifyEmailView />);

    expect(await screen.findByText("Adres e-mail potwierdzony")).toHaveAttribute("role", "status");
    expect(screen.getByRole("link", { name: "Zaloguj się" })).toHaveAttribute("href", "/login");
  });

  it.each([
    ["mentee", ["mentee"], "/account"],
    ["mentor", ["mentee", "mentor"], "/mentor"],
    ["operator", ["operator"], "/admin/invitations"],
  ])("s05.2 zalogowany %s (także z już potwierdzonym adresem — token i tak wysłany): „Przejdź do konta” → %s", async (_role, roles, href) => {
    respond({ me: signedIn({ roles, emailVerified: true }), confirm: confirmed() });

    render(<VerifyEmailView />);

    expect(await screen.findByText("Adres e-mail potwierdzony")).toBeInTheDocument();
    expect(confirmCalls()).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Przejdź do konta" })).toHaveAttribute("href", href);
    expect(screen.queryByText("Twój adres jest już potwierdzony")).not.toBeInTheDocument();
  });

  it("s05.8: token innego konta → pełny adres potwierdzonego konta, sesja bez zmian (bez wylogowania)", async () => {
    respond({ me: signedIn(), confirm: confirmed("b@example.com") });

    render(<VerifyEmailView />);

    expect(
      await screen.findByText("Potwierdzono adres b@example.com. To inne konto niż to, które jest teraz zalogowane."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Przejdź do konta" })).toHaveAttribute("href", "/account");
    expect(apiCall).not.toHaveBeenCalledWith("/api/auth/logout", expect.anything());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("s05.3 gość: „Link jest nieważny albo wygasł” i logowanie z next=/account (token nie trafia do next)", async () => {
    respond({ confirm: INVALID });

    render(<VerifyEmailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
    const link = screen.getByRole("link", { name: "Zaloguj się, aby wysłać nowy link" });
    expect(link).toHaveAttribute("href", "/login?next=%2Faccount");
    expect(link.getAttribute("href")).not.toContain(TOKEN);
  });

  it("s05.3 zalogowany z niepotwierdzonym adresem: „Wyślij ponownie” → potwierdzenie wysyłki", async () => {
    respond({ me: signedIn(), confirm: INVALID, resend: { ok: true, data: null } });

    render(<VerifyEmailView />);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Wyślij ponownie" }));

    expect(await screen.findByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/auth/email-verification/resend", { method: "POST" });
  });

  it("s05.3 zalogowany z potwierdzonym adresem (zużyty link, OP-1): „Przejdź do konta”", async () => {
    respond({ me: signedIn({ emailVerified: true, roles: ["mentee", "mentor"] }), confirm: INVALID });

    render(<VerifyEmailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
    expect(screen.getByRole("link", { name: "Przejdź do konta" })).toHaveAttribute("href", "/mentor");
    expect(screen.queryByRole("button", { name: "Wyślij ponownie" })).not.toBeInTheDocument();
  });

  it("s05.4: bez tokenu, zalogowany z potwierdzonym adresem → „Twój adres jest już potwierdzony”, bez POST", async () => {
    window.history.replaceState(null, "", "/verify-email");
    replaceState.mockClear();
    respond({ me: signedIn({ emailVerified: true }) });

    render(<VerifyEmailView />);

    expect(await screen.findByText("Twój adres jest już potwierdzony")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Przejdź do konta" })).toHaveAttribute("href", "/account");
    expect(confirmCalls()).toHaveLength(0);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it.each([
    ["gość", GUEST, "Zaloguj się, aby wysłać nowy link"],
    ["zalogowany z niepotwierdzonym adresem", signedIn(), "Wyślij ponownie"],
  ])("s05.5: bez tokenu, %s → „Link jest nieważny albo wygasł”", async (_case, me, action) => {
    window.history.replaceState(null, "", "/verify-email");
    respond({ me });

    render(<VerifyEmailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
    expect(screen.getByText(action)).toBeInTheDocument();
    expect(confirmCalls()).toHaveLength(0);
  });

  it.each([["#"], ["#token="], ["#inne=1"]])("pusty albo brak tokenu we fragmencie (%s) → bez POST, fragment wyczyszczony", async (hash) => {
    window.history.replaceState(null, "", `/verify-email${hash}`);
    respond({});

    render(<VerifyEmailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
    expect(confirmCalls()).toHaveLength(0);
    expect(window.location.href).toBe(`${window.location.origin}/verify-email`);
  });

  it("s05.6: 429 → komunikat i ponowienie tym samym tokenem (z pamięci, nie z adresu)", async () => {
    respond({ confirm: { ok: false, error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." } } });

    render(<VerifyEmailView />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Nie udało się sprawdzić linku");
    expect(alert).toHaveTextContent("Za dużo prób. Spróbuj za chwilę.");

    respond({ confirm: confirmed() });
    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByText("Adres e-mail potwierdzony")).toBeInTheDocument();
    expect(confirmCalls().at(-1)).toEqual(["/api/auth/email-verification/confirm", { method: "POST", body: { token: TOKEN } }]);
    expect(window.location.hash).toBe("");
  });

  it("s05.7: 503 przy potwierdzeniu → komunikat serwera", async () => {
    respond({ confirm: { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } } });

    render(<VerifyEmailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Baza danych jest niedostępna");
  });

  it("s05.7: bez tokenu i 503 z /api/auth/me → komunikat serwera zamiast zgadywania stanu", async () => {
    window.history.replaceState(null, "", "/verify-email");
    respond({ me: { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } } });

    render(<VerifyEmailView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Nie udało się sprawdzić linku");
    expect(alert).toHaveTextContent("Baza danych jest niedostępna");
  });

  it("odmontowanie przed odpowiedzią → wynik ignorowany", async () => {
    let resolveMe!: (value: unknown) => void;
    apiCall.mockImplementation((path: string) =>
      path === "/api/auth/me" ? new Promise((done) => (resolveMe = done)) : Promise.resolve(confirmed()),
    );

    const { unmount } = render(<VerifyEmailView />);
    unmount();
    resolveMe(GUEST);
    await Promise.resolve();

    expect(screen.queryByText("Adres e-mail potwierdzony")).not.toBeInTheDocument();
  });
});
