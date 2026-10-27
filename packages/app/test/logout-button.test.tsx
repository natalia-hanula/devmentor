import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { LogoutButton } = await import("../app/_lib/logout-button");

describe("LogoutButton (L04)", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("POST /api/auth/logout, potem /login?notice=logged_out", async () => {
    apiCall.mockResolvedValue({ ok: true, data: null });

    render(<LogoutButton>Wyloguj</LogoutButton>);
    const button = screen.getByRole("button", { name: "Wyloguj" });
    await userEvent.click(button);

    expect(apiCall).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(router.replace).toHaveBeenCalledWith("/login?notice=logged_out");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-variant", "outline");
  });

  it("odmowa serwera → komunikat przy przycisku, bez przekierowania, przycisk znów aktywny", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "NETWORK_ERROR", message: "Brak połączenia z serwerem" } });

    render(<LogoutButton variant="link">Zaloguj się innym kontem</LogoutButton>);
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj się innym kontem" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się wylogować");
    expect(screen.getByRole("alert")).toHaveTextContent("Brak połączenia z serwerem");
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Zaloguj się innym kontem" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Zaloguj się innym kontem" })).toHaveAttribute("data-variant", "link");
  });
});
