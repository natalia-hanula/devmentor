import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/mentor" }));
vi.mock("../app/_lib/require-page-role", () => ({
  PageRoleGate: ({ role, path, children }: { role: string; path: string; children: React.ReactNode }) => (
    <div data-testid="gate" data-role={role} data-path={path}>
      {children}
    </div>
  ),
}));

const { MentorHome } = await import("../app/(mentor)/mentor/mentor-home");
const mentorPage = await import("../app/(mentor)/mentor/page");

const WELCOME = "Masz rolę mentora. Profil, cena i terminy pojawią się tu w kolejnym etapie.";
const BANNER = "Potwierdź adres e-mail — bez tego nie opublikujesz profilu";

describe("MentorPage", () => {
  it("strona: nagłówek, treść za bramką roli mentora na ścieżce /mentor, metadata", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { emailVerified: true } });

    render(mentorPage.default());

    expect(screen.getByRole("heading", { level: 1, name: "Panel mentora" })).toBeInTheDocument();
    expect(screen.getByTestId("gate")).toHaveAttribute("data-role", "mentor");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-path", "/mentor");
    expect(mentorPage.metadata.title).toBe("Panel mentora — DevMentor");
    expect(await screen.findByText(WELCOME)).toBeInTheDocument();
  });
});

describe("MentorHome (s09)", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("s09.1: powitanie, bez banera przy potwierdzonym adresie; dane z GET /api/auth/me", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { emailVerified: true } });

    render(<MentorHome />);
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie panelu…");

    expect(await screen.findByText(WELCOME)).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.queryByRole("region", { name: "Potwierdzenie adresu e-mail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("s09.2: niepotwierdzony adres → baner z „Wyślij ponownie” (G7)", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { emailVerified: false } });

    render(<MentorHome />);

    const banner = await screen.findByRole("region", { name: "Potwierdzenie adresu e-mail" });
    expect(banner).toHaveTextContent(BANNER);
    expect(screen.getByRole("button", { name: "Wyślij ponownie" })).toBeInTheDocument();
  });

  it("s09.2: „Wyślij ponownie” działa z baneru mentora", async () => {
    apiCall.mockImplementation(async (path: string) =>
      path === "/api/auth/me" ? { ok: true, data: { emailVerified: false } } : { ok: true, data: { status: "sent" } },
    );

    render(<MentorHome />);
    await userEvent.click(await screen.findByRole("button", { name: "Wyślij ponownie" }));

    expect(await screen.findByText("Wysłaliśmy nowy link. Sprawdź skrzynkę.")).toBeInTheDocument();
  });

  it("s09.7: błąd (503) → komunikat z ponowieniem", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce({ ok: true, data: { emailVerified: true } });

    render(<MentorHome />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Baza danych jest niedostępna");
    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("401 (np. rola odebrana i sesja wygasła) → /login z „Sesja wygasła”, bez komunikatu błędu", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } });

    render(<MentorHome />);

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fmentor&notice=session_expired"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("przerywa ładowanie przy odmontowaniu i nie ustawia stanu po przerwaniu", async () => {
    let finish!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const { unmount } = render(<MentorHome />);
    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    unmount();
    finish({ ok: true, data: { emailVerified: false } });

    expect(options.signal.aborted).toBe(true);
    await Promise.resolve();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
