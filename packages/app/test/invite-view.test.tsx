import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/invite" }));
vi.mock("../app/_lib/access-denied", () => ({
  AccessDenied: ({ message, roles }: { message: string; roles: string[] }) => (
    <div data-testid="denied" data-roles={roles.join(",")}>
      {message}
    </div>
  ),
}));

const { InviteView, INVITE_TOKEN_STORAGE_KEY } = await import("../app/(auth)/invite/invite-view");
const invitePage = await import("../app/(auth)/invite/page");

const TOKEN = "TajnyTokenZaproszenia_1234567890abcdefghijk";
const MENTEE = { ok: true, data: { roles: ["mentee"] } };
const GUEST = { ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } };
const SESSION_EXPIRED_LOGIN = "/login?next=%2Finvite&notice=session_expired";

function respond({ me = MENTEE, accept }: { me?: unknown; accept?: unknown }) {
  apiCall.mockImplementation(async (path: string) => (path === "/api/auth/me" ? me : accept));
}

const acceptCalls = () => apiCall.mock.calls.filter(([path]) => path === "/api/auth/invitations/accept");
const storedToken = () => window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);

describe("InvitePage", () => {
  it("karta z tytułem i widokiem klienckim, metadata", async () => {
    window.history.replaceState(null, "", "/invite");
    window.sessionStorage.clear();
    const page = invitePage.default();

    expect(invitePage.metadata.title).toBe("Zaproszenie do roli mentora — DevMentor");
    render(page as ReactNode);
    expect(screen.getByRole("heading", { level: 1, name: "Zaproszenie do roli mentora" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
  });
});

describe("InviteView (s08)", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", `/invite#token=${TOKEN}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
    window.sessionStorage.clear();
  });

  it("token z fragmentu trafia do sessionStorage i znika z adresu (łącznie ze znakiem „#”); query zostaje", async () => {
    window.history.replaceState(null, "", `/invite?utm=x#token=${TOKEN}`);
    respond({});

    render(<InviteView />);

    expect(screen.getByRole("status")).toHaveTextContent("Sprawdzanie zaproszenia…");
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(TOKEN);
    expect(window.location.search).toBe("?utm=x");
    expect(storedToken()).toBe(TOKEN);
    await screen.findByRole("button", { name: "Przyjmij zaproszenie" });
  });

  it("s08.8: brak tokenu we fragmencie i w sessionStorage → „Link jest nieważny albo wygasł”, bez zapytań do API", async () => {
    window.history.replaceState(null, "", "/invite");

    render(<InviteView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
    expect(apiCall).not.toHaveBeenCalled();
  });

  it("samo „#” bez tokenu też znika z adresu, a stan to brak tokenu", async () => {
    window.history.replaceState(null, "", "/invite#");

    render(<InviteView />);

    await screen.findByRole("alert");
    expect(window.location.href).not.toContain("#");
  });

  it("powrót z logowania: brak fragmentu, token z sessionStorage → można przyjąć", async () => {
    window.history.replaceState(null, "", "/invite");
    window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, TOKEN);
    respond({ accept: { ok: true, data: { alreadyMentor: false } } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    expect(apiCall).toHaveBeenCalledWith("/api/auth/invitations/accept", { method: "POST", body: { token: TOKEN } });
  });

  it("s08.1 gość: zdanie z L18, linki z next=/invite (bez tokenu w adresie), token czeka w sessionStorage", async () => {
    respond({ me: GUEST });

    render(<InviteView />);

    const notice = await screen.findByText(
      "Masz zaproszenie do roli mentora w DevMentor. Zaloguj się lub załóż konto, aby je przyjąć.",
    );
    expect(notice).toHaveAttribute("role", "status");
    expect(screen.getByRole("link", { name: "Zaloguj się" })).toHaveAttribute("href", "/login?next=%2Finvite");
    expect(screen.getByRole("link", { name: "Załóż konto" })).toHaveAttribute("href", "/register?next=%2Finvite");
    expect(document.body.innerHTML).not.toContain(TOKEN);
    expect(storedToken()).toBe(TOKEN);
    expect(acceptCalls()).toHaveLength(0);
  });

  it("s08.2 zalogowana osoba: „Przyjmij zaproszenie”, rola nie jest nadawana przed kliknięciem", async () => {
    respond({});

    render(<InviteView />);

    expect(await screen.findByRole("button", { name: "Przyjmij zaproszenie" })).toBeEnabled();
    expect(acceptCalls()).toHaveLength(0);
  });

  it("s08.3–s08.4: przyjmowanie (POST z tokenem w treści), potem sessionStorage wyczyszczony i przejście do /mentor", async () => {
    let finish!: (value: unknown) => void;
    apiCall.mockImplementation((path: string) =>
      path === "/api/auth/me" ? Promise.resolve(MENTEE) : new Promise((resolve) => (finish = resolve)),
    );

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    expect(screen.getByRole("status")).toHaveTextContent("Przyjmowanie zaproszenia…");
    expect(screen.queryByRole("button", { name: "Przyjmij zaproszenie" })).not.toBeInTheDocument();
    finish({ ok: true, data: { alreadyMentor: false } });

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/mentor"));
    expect(storedToken()).toBeNull();
  });

  it("s08.5 alreadyMentor: „Masz już rolę mentora”, token wyczyszczony, link do panelu mentora", async () => {
    respond({ accept: { ok: true, data: { alreadyMentor: true } } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    expect(await screen.findByText("Masz już rolę mentora")).toHaveAttribute("role", "status");
    expect(screen.getByRole("link", { name: "Przejdź do panelu mentora" })).toHaveAttribute("href", "/mentor");
    expect(storedToken()).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("s08.6 zaproszenie nieważne (400): komunikat z podpowiedzią (L17) i sessionStorage wyczyszczony", async () => {
    respond({ accept: { ok: false, error: { code: "VALIDATION_ERROR", message: "Zaproszenie jest nieważne" } } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Zaproszenie jest nieważne");
    expect(alert).toHaveTextContent("Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.");
    expect(storedToken()).toBeNull();
    expect(screen.queryByRole("button", { name: "Przyjmij zaproszenie" })).not.toBeInTheDocument();
  });

  it("s08.7 operator (z /api/auth/me): „Brak dostępu” z dopiskiem L09, bez przycisku; token wyczyszczony", async () => {
    respond({ me: { ok: true, data: { roles: ["operator"] } } });

    render(<InviteView />);

    const denied = await screen.findByTestId("denied");
    expect(denied).toHaveTextContent("Zaproszenia przyjmuje konto mentora, nie operatora.");
    expect(denied).toHaveAttribute("data-roles", "operator");
    expect(screen.queryByRole("button", { name: "Przyjmij zaproszenie" })).not.toBeInTheDocument();
    expect(storedToken()).toBeNull();
    expect(acceptCalls()).toHaveLength(0);
  });

  it("s08.7 serwer odmawia (403) mimo przycisku → ten sam widok „Brak dostępu”, token wyczyszczony", async () => {
    respond({ accept: { ok: false, error: { code: "FORBIDDEN", message: "Brak uprawnień" } } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    expect(await screen.findByTestId("denied")).toHaveTextContent("Zaproszenia przyjmuje konto mentora, nie operatora.");
    expect(storedToken()).toBeNull();
  });

  it("s08.9 429/503 przy przyjmowaniu: komunikat z serwera, token zostaje, „Spróbuj ponownie” ponawia przyjęcie", async () => {
    apiCall.mockImplementation(async (path: string) => (path === "/api/auth/me" ? MENTEE : undefined));
    apiCall
      .mockResolvedValueOnce(MENTEE)
      .mockResolvedValueOnce({ ok: false, error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." } })
      .mockResolvedValueOnce({ ok: true, data: { alreadyMentor: false } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Za dużo prób. Spróbuj za chwilę.");
    expect(storedToken()).toBe(TOKEN);
    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/mentor"));
    expect(acceptCalls()).toHaveLength(2);
  });

  it("s08.9 błąd sprawdzenia sesji (503): komunikat i ponowienie od początku", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce(MENTEE);

    render(<InviteView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Baza danych jest niedostępna");
    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByRole("button", { name: "Przyjmij zaproszenie" })).toBeInTheDocument();
  });

  it("401 przy przyjmowaniu (sesja wygasła) → /login z „Sesja wygasła” i powrotem na /invite; token zostaje", async () => {
    respond({ accept: GUEST });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN));
    expect(storedToken()).toBe(TOKEN);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Strict Mode (podwójny efekt): jedno odczytanie fragmentu i jedno sprawdzenie sesji", async () => {
    respond({});

    render(
      <StrictMode>
        <InviteView />
      </StrictMode>,
    );

    await screen.findByRole("button", { name: "Przyjmij zaproszenie" });
    expect(apiCall.mock.calls.filter(([path]) => path === "/api/auth/me")).toHaveLength(1);
  });

  it("sessionStorage niedostępny (tryb prywatny): token zostaje w pamięci i da się przyjąć zaproszenie", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    respond({ accept: { ok: true, data: { alreadyMentor: true } } });

    render(<InviteView />);
    await userEvent.click(await screen.findByRole("button", { name: "Przyjmij zaproszenie" }));

    expect(apiCall).toHaveBeenCalledWith("/api/auth/invitations/accept", { method: "POST", body: { token: TOKEN } });
    expect(await screen.findByText("Masz już rolę mentora")).toBeInTheDocument();
  });

  it("sessionStorage niedostępny przy odczycie → jak brak tokenu", async () => {
    window.history.replaceState(null, "", "/invite");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(<InviteView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Link jest nieważny albo wygasł");
  });

  it("odmontowanie przed odpowiedzią nie ustawia stanu (bez ostrzeżeń)", async () => {
    let finish!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const { unmount } = render(<InviteView />);
    unmount();
    finish(MENTEE);

    await Promise.resolve();
    expect(screen.queryByRole("button", { name: "Przyjmij zaproszenie" })).not.toBeInTheDocument();
  });
});
