import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// Pozycja „Skrzynka” jest asynchroniczna (env w czasie żądania) — testy w outbox-nav-link.test.tsx.
vi.mock("../app/(operator)/outbox-nav-link", () => ({
  OutboxNavLink: ({ className }: { className: string }) => (
    <a href="/admin/outbox" className={className}>
      Skrzynka (atrapa)
    </a>
  ),
}));

const { default: RootLayout, metadata } = await import("../app/layout");
const { default: AdminLayout } = await import("../app/(operator)/layout");

const layoutProps = (children: React.ReactNode) => ({ children, params: Promise.resolve({}) }) as LayoutProps<"/">;

describe("RootLayout", () => {
  it("ustawia język i renderuje dzieci w <body>", () => {
    const html = RootLayout(layoutProps(<p>treść</p>)) as ReactElement<{ lang: string; className: string; children: ReactElement<{ children: React.ReactNode }> }>;

    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
    expect(html.props.className).toContain("antialiased");
    expect(html.props.children.type).toBe("body");
    expect(isValidElement(html.props.children.props.children)).toBe(true);
    expect(metadata.title).toBeTruthy();
  });
});

describe("AdminLayout", () => {
  it("renderuje nawigację panelu i treść strony", () => {
    render(AdminLayout(layoutProps(<p>Treść panelu</p>)));

    expect(screen.getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Zaproszenia" })).toHaveAttribute("href", "/admin/invitations");
    expect(screen.getByRole("link", { name: "Przegląd" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Technologie" })).toHaveAttribute("href", "/admin/technologies");
    expect(screen.getByRole("link", { name: "Skrzynka (atrapa)" })).toHaveClass("hover:text-foreground");
    expect(screen.getByRole("main")).toHaveTextContent("Treść panelu");
  });
});
