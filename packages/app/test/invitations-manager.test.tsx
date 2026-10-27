import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/admin/invitations" }));

const SESSION_EXPIRED_LOGIN = "/login?next=%2Fadmin%2Finvitations&notice=session_expired";
const UNAUTHORIZED = { ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } };
const LINK = "https://devmentor.example/invite#token=TajnyToken123";

const { InvitationsManager } = await import("../app/(operator)/admin/invitations/invitations-manager");

const base = { createdAt: "2026-10-20T10:00:00.000Z", expiresAt: "2026-11-03T10:00:00.000Z" };
const PENDING = { id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b", email: "adam@example.com", status: "pending", ...base };
const REVOKED = { id: "b", email: "stary@example.com", status: "revoked", ...base };
const EXPIRED = { id: "c", email: "wygasle@example.com", status: "expired", ...base };
const ACCEPTED = {
  id: "d",
  email: "ewa@example.com",
  status: "accepted",
  ...base,
  acceptedBy: { id: "u1", displayName: "Ewa", email: "ewa.inny@example.com", mentorRoleRemoved: false },
};
const ACCEPTED_REMOVED = {
  ...ACCEPTED,
  id: "e",
  email: "ola@example.com",
  acceptedBy: { id: "u2", displayName: "Ola", email: "ola@example.com", mentorRoleRemoved: true },
};
const CREATED = { invitation: PENDING, link: LINK, revokedPrevious: false, mailFailed: false };

type Options = { method?: string; body?: unknown; signal?: AbortSignal } | undefined;

function respond(handler: (path: string, options: Options) => unknown) {
  apiCall.mockImplementation(async (path: string, options?: Options) => handler(path, options));
}

async function createInvitation(email = "adam@example.com") {
  await userEvent.click(await screen.findByRole("button", { name: "Zaproś mentora" }));
  await userEvent.type(screen.getByLabelText("E-mail zapraszanej osoby"), email);
  await userEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));
}

describe("InvitationsManager — lista", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("pokazuje statusy po polsku, daty i „przyjęte przez” z dopiskiem „rola mentora odebrana” (L10, L12)", async () => {
    respond(() => ({ ok: true, data: [PENDING, ACCEPTED, ACCEPTED_REMOVED, REVOKED, EXPIRED] }));

    render(<InvitationsManager />);

    const pendingRow = (await screen.findByRole("cell", { name: "adam@example.com" })).closest("tr")!;
    expect(within(pendingRow).getByText("Oczekuje")).toBeInTheDocument();
    expect(within(pendingRow).getByRole("cell", { name: "20.10.2026" })).toBeInTheDocument();
    expect(within(pendingRow).getByRole("cell", { name: "3.11.2026" })).toBeInTheDocument();
    expect(within(pendingRow).getByRole("cell", { name: "—" })).toBeInTheDocument();
    const acceptedRow = screen.getByRole("cell", { name: "ewa@example.com" }).closest("tr")!;
    expect(within(acceptedRow).getByText("Przyjęte")).toBeInTheDocument();
    expect(within(acceptedRow).getByText("Ewa (ewa.inny@example.com)")).toBeInTheDocument();
    expect(within(acceptedRow).queryByText("rola mentora odebrana")).not.toBeInTheDocument();
    const removedRow = screen.getByRole("cell", { name: "ola@example.com" }).closest("tr")!;
    expect(within(removedRow).getByText("rola mentora odebrana")).toBeInTheDocument();
    expect(screen.getByText("Cofnięte")).toBeInTheDocument();
    expect(screen.getByText("Wygasło")).toBeInTheDocument();
  });

  it("„Cofnij” tylko przy oczekującym zaproszeniu", async () => {
    respond(() => ({ ok: true, data: [PENDING, ACCEPTED, REVOKED, EXPIRED] }));

    render(<InvitationsManager />);
    await screen.findByRole("cell", { name: "adam@example.com" });

    expect(screen.getAllByRole("button", { name: "Cofnij" })).toHaveLength(1);
    expect(within(screen.getByRole("cell", { name: "adam@example.com" }).closest("tr")!).getByRole("button", { name: "Cofnij" })).toBeInTheDocument();
  });

  it("pusta lista → komunikat zachęcający do pierwszego zaproszenia", async () => {
    respond(() => ({ ok: true, data: [] }));

    render(<InvitationsManager />);

    expect(await screen.findByText("Brak zaproszeń")).toBeInTheDocument();
  });

  it("błąd listy → komunikat i ponowienie", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce({ ok: true, data: [PENDING] });

    render(<InvitationsManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByRole("cell", { name: "adam@example.com" })).toBeInTheDocument();
  });

  it("401 przy ładowaniu → /login z „Sesja wygasła” i powrotem tutaj", async () => {
    respond(() => UNAUTHORIZED);

    render(<InvitationsManager />);

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN));
  });

  it("przerywa ładowanie przy odmontowaniu i nie pokazuje spóźnionej odpowiedzi", async () => {
    let finish!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const { unmount } = render(<InvitationsManager />);
    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    unmount();
    finish({ ok: true, data: [PENDING] });

    expect(options.signal.aborted).toBe(true);
    expect(screen.queryByRole("cell", { name: "adam@example.com" })).not.toBeInTheDocument();
  });
});

describe("InvitationsManager — cofanie", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("„Cofnij” → DELETE ?id= i przeładowanie listy", async () => {
    let list = [PENDING];
    respond((_path, options) => {
      if (options?.method === "DELETE") {
        list = [{ ...PENDING, status: "revoked" }];
        return { ok: true, data: { id: PENDING.id } };
      }
      return { ok: true, data: list };
    });

    render(<InvitationsManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Cofnij" }));

    expect(await screen.findByText("Cofnięte")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith(`/api/auth/invitations?id=${PENDING.id}`, { method: "DELETE" });
  });

  it("odmowa (np. przyjęte w międzyczasie) → komunikat z serwera i odświeżona lista", async () => {
    let list: unknown[] = [PENDING];
    respond((_path, options) => {
      if (options?.method === "DELETE") {
        list = [ACCEPTED];
        return { ok: false, error: { code: "CONFLICT", message: "Zaproszenie zostało już przyjęte" } };
      }
      return { ok: true, data: list };
    });

    render(<InvitationsManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Cofnij" }));

    expect(await screen.findByText("Nie cofnięto zaproszenia")).toBeInTheDocument();
    expect(screen.getByText("Zaproszenie zostało już przyjęte")).toBeInTheDocument();
    expect(await screen.findByText("Przyjęte")).toBeInTheDocument();
  });

  it("401 przy cofaniu → przekierowanie zamiast komunikatu błędu", async () => {
    respond((_path, options) => (options?.method === "DELETE" ? UNAUTHORIZED : { ok: true, data: [PENDING] }));

    render(<InvitationsManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Cofnij" }));

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN));
    expect(screen.queryByText("Nie cofnięto zaproszenia")).not.toBeInTheDocument();
  });
});

describe("InvitationsManager — tworzenie i jednorazowy panel z linkiem", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => undefined) }, configurable: true });
  });

  function respondWithCreated(created: unknown = CREATED) {
    let list: unknown[] = [];
    respond((_path, options) => {
      if (options?.method === "POST") {
        list = [PENDING];
        return { ok: true, data: created };
      }
      return { ok: true, data: list };
    });
  }

  it("formularz otwiera się przyciskiem „Zaproś mentora”; Escape go zamyka", async () => {
    respond(() => ({ ok: true, data: [] }));

    render(<InvitationsManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Zaproś mentora" }));

    expect(screen.getByLabelText("E-mail zapraszanej osoby")).toBeInTheDocument();
    expect(screen.getByText(/Zaproszenie jest ważne 14 dni/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("E-mail zapraszanej osoby"), "{Escape}");
    expect(screen.queryByLabelText("E-mail zapraszanej osoby")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaproś mentora" })).toBeInTheDocument();
  });

  it("niepoprawny e-mail → błąd przy polu, bez wywołania API tworzenia", async () => {
    respond(() => ({ ok: true, data: [] }));

    render(<InvitationsManager />);
    await createInvitation("nie-adres");

    expect(await screen.findByText(/Podaj poprawny adres e-mail/)).toBeInTheDocument();
    expect(apiCall).not.toHaveBeenCalledWith("/api/auth/invitations", expect.objectContaining({ method: "POST" }));
  });

  it("sukces: POST z e-mailem, formularz się zamyka, lista się przeładowuje, panel pokazuje link i „Link widzisz tylko teraz”", async () => {
    respondWithCreated();

    render(<InvitationsManager />);
    await createInvitation();

    const panel = await screen.findByRole("region", { name: "Utworzone zaproszenie" });
    expect(apiCall).toHaveBeenCalledWith("/api/auth/invitations", { method: "POST", body: { email: "adam@example.com" } });
    expect(within(panel).getByText("Zaproszenie dla adam@example.com")).toBeInTheDocument();
    expect(within(panel).getByText("Link widzisz tylko teraz.")).toBeInTheDocument();
    expect(within(panel).getByText(LINK)).toBeInTheDocument();
    expect(within(panel).queryByText(/Poprzednie zaproszenie/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail zapraszanej osoby")).not.toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "adam@example.com" })).toBeInTheDocument();
  });

  it("revokedPrevious → „Poprzednie zaproszenie dla tego adresu zostało cofnięte” (L20)", async () => {
    respondWithCreated({ ...CREATED, revokedPrevious: true });

    render(<InvitationsManager />);
    await createInvitation();

    expect(await screen.findByText("Poprzednie zaproszenie dla tego adresu zostało cofnięte")).toBeInTheDocument();
  });

  it("mailFailed → ostrzeżenie z prośbą o ręczne przekazanie linku; link nadal widoczny", async () => {
    respondWithCreated({ ...CREATED, mailFailed: true });

    render(<InvitationsManager />);
    await createInvitation();

    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent("Nie wysłano e-maila");
    expect(warning).toHaveTextContent("Przekaż link zaproszonej osobie samodzielnie.");
    expect(screen.getByText(LINK)).toBeInTheDocument();
  });

  it("„Kopiuj” kopiuje link do schowka i zmienia etykietę na „Skopiowano”", async () => {
    respondWithCreated();

    render(<InvitationsManager />);
    await createInvitation();
    await userEvent.click(await screen.findByRole("button", { name: "Kopiuj" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole("button", { name: "Skopiowano" })).toBeInTheDocument();
  });

  it("schowek niedostępny → wskazówka, żeby zaznaczyć link ręcznie", async () => {
    respondWithCreated();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(async () => Promise.reject(new Error("odmowa"))) },
      configurable: true,
    });

    render(<InvitationsManager />);
    await createInvitation();
    await userEvent.click(await screen.findByRole("button", { name: "Kopiuj" }));

    expect(await screen.findByText("Nie udało się skopiować — zaznacz link ręcznie.")).toBeInTheDocument();
  });

  it("„Zamknij” usuwa panel z linkiem — po zamknięciu nie da się go odzyskać", async () => {
    respondWithCreated();

    render(<InvitationsManager />);
    await createInvitation();
    await userEvent.click(await screen.findByRole("button", { name: "Zamknij" }));

    expect(screen.queryByRole("region", { name: "Utworzone zaproszenie" })).not.toBeInTheDocument();
    expect(screen.queryByText(LINK)).not.toBeInTheDocument();
  });

  it("409 (wyścig) → komunikat przy formularzu i automatyczne odświeżenie listy", async () => {
    let list: unknown[] = [];
    respond((_path, options) => {
      if (options?.method === "POST") {
        list = [PENDING];
        return {
          ok: false,
          error: { code: "CONFLICT", message: "Zaproszenie dla tego adresu właśnie powstało — odśwież listę" },
        };
      }
      return { ok: true, data: list };
    });

    render(<InvitationsManager />);
    await createInvitation();

    expect(await screen.findByText("Zaproszenie dla tego adresu właśnie powstało — odśwież listę")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "adam@example.com" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Utworzone zaproszenie" })).not.toBeInTheDocument();
  });

  it("inny błąd przy tworzeniu (403) → komunikat przy formularzu, bez panelu i bez przeładowania listy", async () => {
    respond((_path, options) =>
      options?.method === "POST"
        ? { ok: false, error: { code: "FORBIDDEN", message: "Brak uprawnień" } }
        : { ok: true, data: [] },
    );

    render(<InvitationsManager />);
    await createInvitation();

    expect(await screen.findByText("Brak uprawnień")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("401 przy tworzeniu → przekierowanie na /login z „Sesja wygasła”", async () => {
    respond((_path, options) => (options?.method === "POST" ? UNAUTHORIZED : { ok: true, data: [] }));

    render(<InvitationsManager />);
    await createInvitation();

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith(SESSION_EXPIRED_LOGIN));
  });
});
