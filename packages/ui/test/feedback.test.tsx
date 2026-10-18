import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../src/backend/feedback/empty-state";
import { ErrorMessage } from "../src/backend/feedback/error-message";
import { LoadingMessage } from "../src/backend/feedback/loading-message";

describe("LoadingMessage", () => {
  it("ogłasza stan ładowania z domyślną lub własną etykietą", () => {
    const { rerender } = render(<LoadingMessage />);
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie…");

    rerender(<LoadingMessage label="Sprawdzanie…" className="extra" />);
    expect(screen.getByRole("status")).toHaveTextContent("Sprawdzanie…");
    expect(screen.getByRole("status")).toHaveClass("extra");
  });
});

describe("ErrorMessage", () => {
  it("pokazuje tytuł i komunikat jako alert, bez przycisku ponowienia domyślnie", () => {
    render(<ErrorMessage message="Brak połączenia" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Coś poszło nie tak");
    expect(screen.getByRole("alert")).toHaveTextContent("Brak połączenia");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("wywołuje onRetry po kliknięciu „Spróbuj ponownie”", async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage title="Błąd" message="X" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd");
  });
});

describe("EmptyState", () => {
  it("pokazuje tytuł oraz opcjonalny opis i akcję", () => {
    const { rerender } = render(<EmptyState title="Brak danych" />);
    expect(screen.getByText("Brak danych")).toBeInTheDocument();

    rerender(<EmptyState title="Brak danych" description="Dodaj pierwszy rekord" action={<button>Dodaj</button>} />);
    expect(screen.getByText("Dodaj pierwszy rekord")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dodaj" })).toBeInTheDocument();
  });
});
