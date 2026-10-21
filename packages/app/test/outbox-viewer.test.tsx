import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));

const { OutboxViewer } = await import("../app/(operator)/admin/outbox/outbox-viewer");

const ANNOTATION = "Skrzynka deweloperska — wiadomości nie są wysyłane";
const VERIFY_LINK = "http://localhost:3000/verify-email#token=abc123";
const VERIFY = {
  id: "m2",
  to: "ola@example.com",
  subject: "Potwierdź adres e-mail",
  text: `Cześć!\nPotwierdź adres, otwierając link: ${VERIFY_LINK}.\nLink jest ważny 24 h.`,
  sentAt: "2026-10-21T09:00:00.000Z",
};
const INVITE = {
  id: "m1",
  to: "ala@example.com",
  subject: "Zaproszenie do roli mentora",
  text: "Masz zaproszenie: https://devmentor.test/invite#token=xyz",
  sentAt: "2026-10-20T22:30:00.000Z",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("OutboxViewer", () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it("pobiera /api/mail/outbox przez apiCall i podczas ładowania pokazuje adnotację i stan ładowania", () => {
    apiCall.mockReturnValue(new Promise(() => undefined));

    render(<OutboxViewer />);

    expect(apiCall).toHaveBeenCalledWith("/api/mail/outbox", { signal: expect.any(AbortSignal) });
    expect(screen.getByText(ANNOTATION)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie…");
  });

  it("pusta skrzynka → komunikat o pustej liście z informacją o restarcie", async () => {
    apiCall.mockResolvedValue({ ok: true, data: [] });

    render(<OutboxViewer />);

    expect(await screen.findByText("Brak wiadomości")).toBeInTheDocument();
    expect(screen.getByText("Skrzynka czyści się po restarcie serwera.")).toBeInTheDocument();
    expect(screen.getByText(ANNOTATION)).toBeInTheDocument();
  });

  it("lista: data po polsku w strefie Europe/Warsaw, adresat, temat i „Pokaż” z aria-expanded=false", async () => {
    apiCall.mockResolvedValue({ ok: true, data: [VERIFY, INVITE] });

    render(<OutboxViewer />);

    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]!).getByRole("cell", { name: "21.10.2026, 11:00" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("cell", { name: "ola@example.com" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("cell", { name: "Potwierdź adres e-mail" })).toBeInTheDocument();
    // 22:30 UTC 20.10 to już 21.10 w Warszawie.
    expect(within(rows[2]!).getByRole("cell", { name: "21.10.2026, 00:30" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pokaż" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Pokaż" })[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("„Pokaż” otwiera kartę z treścią i klikalnym linkiem, „Zwiń” ją zamyka", async () => {
    apiCall.mockResolvedValue({ ok: true, data: [VERIFY, INVITE] });
    render(<OutboxViewer />);
    const [showVerify] = await screen.findAllByRole("button", { name: "Pokaż" });

    await userEvent.click(showVerify!);

    expect(screen.getByRole("heading", { level: 2, name: "Potwierdź adres e-mail" })).toBeInTheDocument();
    expect(screen.getByText("Do: ola@example.com · 21.10.2026, 11:00")).toBeInTheDocument();
    // Kropka kończąca zdanie nie wchodzi do linku; reszta treści zostaje tekstem.
    expect(screen.getByRole("link", { name: VERIFY_LINK })).toHaveAttribute("href", VERIFY_LINK);
    expect(screen.getByText(/Link jest ważny 24 h\./)).toBeInTheDocument();
    const collapse = screen.getByRole("button", { name: "Zwiń" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(collapse);

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pokaż" })).toHaveLength(2);
  });

  it("„Pokaż” przy innej wiadomości przełącza kartę", async () => {
    apiCall.mockResolvedValue({ ok: true, data: [VERIFY, INVITE] });
    render(<OutboxViewer />);
    const buttons = await screen.findAllByRole("button", { name: "Pokaż" });

    await userEvent.click(buttons[0]!);
    await userEvent.click(screen.getByRole("button", { name: "Pokaż" }));

    expect(screen.getByRole("heading", { level: 2, name: "Zaproszenie do roli mentora" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://devmentor.test/invite#token=xyz" })).toHaveAttribute(
      "href",
      "https://devmentor.test/invite#token=xyz",
    );
  });

  it("treść bez adresu nie ma linków i nie jest interpretowana jako HTML", async () => {
    apiCall.mockResolvedValue({
      ok: true,
      data: [{ ...INVITE, text: '<a href="javascript:alert(1)">klik</a> i javascript:alert(2)' }],
    });
    render(<OutboxViewer />);

    await userEvent.click(await screen.findByRole("button", { name: "Pokaż" }));

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText('<a href="javascript:alert(1)">klik</a> i javascript:alert(2)')).toBeInTheDocument();
  });

  it("błąd ładowania pokazuje komunikat i ponawia przez „Spróbuj ponownie”", async () => {
    const retry = deferred<unknown>();
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockReturnValueOnce(retry.promise);

    render(<OutboxViewer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Baza danych jest niedostępna");

    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie…");

    retry.resolve({ ok: true, data: [VERIFY] });
    expect(await screen.findByRole("cell", { name: "ola@example.com" })).toBeInTheDocument();
    expect(apiCall).toHaveBeenLastCalledWith("/api/mail/outbox");
  });

  it("404 (adapter noop) → komunikat „wyłączona”, bez adnotacji i bez tabeli", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "Skrzynka deweloperska jest wyłączona" } });

    render(<OutboxViewer />);

    expect(await screen.findByText("Skrzynka deweloperska jest wyłączona")).toBeInTheDocument();
    expect(screen.getByText(/MAIL_ADAPTER=noop/)).toBeInTheDocument();
    expect(screen.queryByText(ANNOTATION)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).not.toBeInTheDocument();
  });

  it("odpowiedź po odmontowaniu jest ignorowana (żądanie przerwane)", async () => {
    const pending = deferred<unknown>();
    apiCall.mockReturnValue(pending.promise);

    const { unmount } = render(<OutboxViewer />);
    unmount();
    pending.resolve({ ok: true, data: [VERIFY] });
    await pending.promise;

    expect((apiCall.mock.calls[0]![1] as { signal: AbortSignal }).signal.aborted).toBe(true);
  });
});
