import { render, screen, within } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/technologies" }));
vi.mock("../app/_lib/signed-in-header", () => ({ SignedInHeader: () => <header>nagłówek zalogowanego</header> }));

// Pozycja „Skrzynka” jest asynchroniczna (env w czasie żądania) — testy w outbox-nav-link.test.tsx.
vi.mock("../app/(operator)/outbox-nav-link", () => ({
  OutboxNavLink: () => <a href="/admin/outbox">Skrzynka (atrapa)</a>,
}));

const { default: RootLayout, metadata } = await import("../app/layout");
const { default: AdminLayout } = await import("../app/(operator)/layout");
const { default: MentorLayout } = await import("../app/(mentor)/layout");
const { default: MenteeLayout } = await import("../app/(mentee)/layout");

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
  it("renderuje nagłówek zalogowanego, nawigację panelu z aktywną pozycją i treść strony", () => {
    render(AdminLayout(layoutProps(<p>Treść panelu</p>)));

    expect(screen.getByText("nagłówek zalogowanego")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Panel operatora" });
    expect(within(nav).getByRole("link", { name: "Zaproszenia" })).toHaveAttribute("href", "/admin/invitations");
    expect(within(nav).getByRole("link", { name: "Przegląd" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: "Technologie" })).toHaveAttribute("href", "/admin/technologies");
    expect(within(nav).getByRole("link", { name: "Technologie" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Przegląd" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Skrzynka (atrapa)" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Treść panelu");
  });
});

describe("MentorLayout", () => {
  it("renderuje nagłówek zalogowanego i treść w <main>", () => {
    render(MentorLayout(layoutProps(<p>Treść mentora</p>)));

    expect(screen.getByText("nagłówek zalogowanego")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Treść mentora");
  });
});

describe("MenteeLayout", () => {
  it("renderuje nagłówek zalogowanego i treść strony", () => {
    render(MenteeLayout(layoutProps(<p>Treść konta</p>)));

    expect(screen.getByText("nagłówek zalogowanego")).toBeInTheDocument();
    expect(screen.getByText("Treść konta")).toBeInTheDocument();
  });
});
