import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/_lib/logout-button", () => ({
  LogoutButton: ({ children }: { children: string }) => <button type="button">{children}</button>,
}));

const { AccessDenied } = await import("../app/_lib/access-denied");

describe("AccessDenied (s13, L09)", () => {
  it("tytuł, podane zdanie, przycisk do strony startowej roli i „Zaloguj się innym kontem”", () => {
    render(<AccessDenied message="Ta strona wymaga roli operatora." roles={["mentee", "mentor"]} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Nie masz dostępu do tej strony");
    expect(screen.getByRole("alert")).toHaveTextContent("Ta strona wymaga roli operatora.");
    expect(screen.getByRole("link", { name: "Wróć do swojej strony startowej" })).toHaveAttribute("href", "/mentor");
    expect(screen.getByRole("button", { name: "Zaloguj się innym kontem" })).toBeInTheDocument();
  });

  it("strona startowa operatora i mentee zależy od ról", () => {
    const { rerender } = render(<AccessDenied message="x" roles={["operator"]} />);
    expect(screen.getByRole("link", { name: "Wróć do swojej strony startowej" })).toHaveAttribute("href", "/admin/invitations");

    rerender(<AccessDenied message="x" roles={["mentee"]} />);
    expect(screen.getByRole("link", { name: "Wróć do swojej strony startowej" })).toHaveAttribute("href", "/account");
  });
});
