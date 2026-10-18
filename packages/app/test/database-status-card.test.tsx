import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));

const { DatabaseStatusCard } = await import("../app/(admin)/admin/database-status-card");

describe("DatabaseStatusCard", () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it("pokazuje sprawdzanie, a potem połączenie z wersją serwera", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ok: true, serverVersion: "17.11" } });

    render(<DatabaseStatusCard />);

    expect(screen.getByRole("status")).toHaveTextContent("Sprawdzanie połączenia…");
    expect(await screen.findByText("Połączono · PostgreSQL 17.11")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/health", { signal: expect.any(AbortSignal) });
  });

  it("pokazuje brak połączenia, gdy baza nie odpowiada", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ok: false } });

    render(<DatabaseStatusCard />);

    expect(await screen.findByText("Brak połączenia")).toBeInTheDocument();
  });

  it("pokazuje błąd API i pozwala ponowić sprawdzenie", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce({ ok: true, data: { ok: true, serverVersion: "17.11" } });

    render(<DatabaseStatusCard />);
    await userEvent.click(await screen.findByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByText("Połączono · PostgreSQL 17.11")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("przycisk „Odśwież” ponownie sprawdza stan bazy", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ok: true, serverVersion: "17.11" } });

    render(<DatabaseStatusCard />);
    await screen.findByText("Połączono · PostgreSQL 17.11");
    await userEvent.click(screen.getByRole("button", { name: "Odśwież" }));

    expect(await screen.findByText("Połączono · PostgreSQL 17.11")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("przerywa żądanie przy odmontowaniu komponentu", () => {
    apiCall.mockReturnValue(new Promise(() => undefined));

    const { unmount } = render(<DatabaseStatusCard />);
    unmount();

    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    expect(options.signal.aborted).toBe(true);
  });
});
