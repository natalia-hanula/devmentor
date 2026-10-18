import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));

const { TechnologiesManager } = await import("../app/(admin)/admin/technologies/technologies-manager");

const GO = { id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b", name: "Go", slug: "go", createdAt: "2026-10-18T10:00:00.000Z" };
const RUST = { id: "8a2d2f0e-1b8a-4c39-9a51-0c8e7c3a1d2c", name: "Rust", slug: "rust", createdAt: "2026-10-18T10:00:00.000Z" };

type Call = [string, { method?: string; body?: unknown; signal?: AbortSignal }?];

function respond(handler: (path: string, options: Call[1]) => unknown) {
  apiCall.mockImplementation(async (path: string, options?: Call[1]) => handler(path, options));
}

describe("TechnologiesManager", () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it("ładuje listę technologii do tabeli", async () => {
    respond(() => ({ ok: true, data: [GO, RUST] }));

    render(<TechnologiesManager />);

    expect(await screen.findByRole("cell", { name: "Go" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "rust" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "18.10.2026" })).toHaveLength(2);
  });

  it("pokazuje błąd ładowania i ponawia przez „Spróbuj ponownie”", async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } })
      .mockResolvedValueOnce({ ok: true, data: [GO] });

    render(<TechnologiesManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Spróbuj ponownie" }));

    expect(await screen.findByRole("cell", { name: "Go" })).toBeInTheDocument();
  });

  it("usuwa technologię i przeładowuje listę", async () => {
    let list = [GO, RUST];
    respond((path, options) => {
      if (options?.method === "DELETE") {
        list = list.filter((t) => !path.includes(t.id));
        return { ok: true, data: { id: GO.id } };
      }
      return { ok: true, data: list };
    });

    render(<TechnologiesManager />);
    const goRow = (await screen.findByRole("cell", { name: "Go" })).closest("tr")!;
    await userEvent.click(within(goRow).getByRole("button", { name: "Usuń" }));

    await vi.waitFor(() => expect(screen.queryByRole("cell", { name: "Go" })).not.toBeInTheDocument());
    expect(apiCall).toHaveBeenCalledWith(`/api/technologies?id=${GO.id}`, { method: "DELETE" });
  });

  it("pokazuje błąd usuwania (np. brak sesji)", async () => {
    respond((_path, options) =>
      options?.method === "DELETE"
        ? { ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } }
        : { ok: true, data: [GO] },
    );

    render(<TechnologiesManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Usuń" }));

    expect(await screen.findByText("Nie usunięto")).toBeInTheDocument();
    expect(screen.getByText("Wymagane zalogowanie")).toBeInTheDocument();
  });

  it("dodaje technologię formularzem i przeładowuje listę", async () => {
    let list = [GO];
    respond((_path, options) => {
      if (options?.method === "POST") {
        list = [...list, RUST];
        return { ok: true, data: RUST };
      }
      return { ok: true, data: list };
    });

    render(<TechnologiesManager />);
    await screen.findByRole("cell", { name: "Go" });
    await userEvent.type(screen.getByLabelText("Nazwa"), "Rust");
    await userEvent.type(screen.getByLabelText("Slug"), "rust");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(await screen.findByRole("cell", { name: "Rust" })).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith("/api/technologies", { method: "POST", body: { name: "Rust", slug: "rust" } });
  });

  it("przerywa ładowanie przy odmontowaniu", () => {
    apiCall.mockReturnValue(new Promise(() => undefined));

    const { unmount } = render(<TechnologiesManager />);
    unmount();

    const [, options] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    expect(options.signal.aborted).toBe(true);
  });
});
