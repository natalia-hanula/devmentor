import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("../app/_lib/require-page-role", () => ({
  PageRoleGate: ({ role, path, children }: { role: string; path: string; children: ReactNode }) => (
    <div data-testid="gate" data-role={role} data-path={path}>
      {children}
    </div>
  ),
}));
vi.mock("../app/(operator)/admin/database-status-card", () => ({
  DatabaseStatusCard: () => <div>karta stanu bazy</div>,
}));
vi.mock("../app/(operator)/admin/technologies/technologies-manager", () => ({
  TechnologiesManager: () => <div>zarządzanie technologiami</div>,
}));

const { default: HomePage } = await import("../app/(marketing)/page");
const adminPage = await import("../app/(operator)/admin/page");
const technologiesPage = await import("../app/(operator)/admin/technologies/page");

describe("strony", () => {
  it("HomePage renderuje stronę startową", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Next.js logo" })).toBeInTheDocument();
  });

  it("AdminPage pokazuje nagłówek i kartę stanu bazy", () => {
    render(<adminPage.default />);

    expect(screen.getByRole("heading", { name: "Panel admina" })).toBeInTheDocument();
    expect(screen.getByText("karta stanu bazy")).toBeInTheDocument();
    expect(adminPage.metadata.title).toContain("Panel admina");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-role", "operator");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-path", "/admin");
  });

  it("TechnologiesPage pokazuje nagłówek i zarządzanie technologiami", () => {
    render(<technologiesPage.default />);

    expect(screen.getByRole("heading", { name: "Technologie" })).toBeInTheDocument();
    expect(screen.getByText("zarządzanie technologiami")).toBeInTheDocument();
    expect(technologiesPage.metadata.title).toContain("Technologie");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-role", "operator");
    expect(screen.getByTestId("gate")).toHaveAttribute("data-path", "/admin/technologies");
  });
});
