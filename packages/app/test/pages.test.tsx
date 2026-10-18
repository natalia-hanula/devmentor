import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("../app/(admin)/admin/database-status-card", () => ({
  DatabaseStatusCard: () => <div>karta stanu bazy</div>,
}));
vi.mock("../app/(admin)/admin/technologies/technologies-manager", () => ({
  TechnologiesManager: () => <div>zarządzanie technologiami</div>,
}));

const { default: HomePage } = await import("../app/(marketing)/page");
const adminPage = await import("../app/(admin)/admin/page");
const technologiesPage = await import("../app/(admin)/admin/technologies/page");

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
  });

  it("TechnologiesPage pokazuje nagłówek i zarządzanie technologiami", () => {
    render(<technologiesPage.default />);

    expect(screen.getByRole("heading", { name: "Technologie" })).toBeInTheDocument();
    expect(screen.getByText("zarządzanie technologiami")).toBeInTheDocument();
    expect(technologiesPage.metadata.title).toContain("Technologie");
  });
});
