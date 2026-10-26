import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectSignedIn = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../app/(auth)/auth-entry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../app/(auth)/auth-entry")>()),
  redirectSignedIn,
}));
vi.mock("../app/(auth)/login/login-form", () => ({
  LoginForm: ({ next }: { next?: string }) => <div data-testid="login-form" data-next={next ?? ""} />,
}));
vi.mock("../app/(auth)/register/register-form", () => ({
  RegisterForm: ({ next }: { next?: string }) => <div data-testid="register-form" data-next={next ?? ""} />,
}));
vi.mock("../app/(auth)/account/account-view", () => ({ AccountView: () => <div>widok konta</div> }));

const loginPage = await import("../app/(auth)/login/page");
const registerPage = await import("../app/(auth)/register/page");
const accountPage = await import("../app/(auth)/account/page");
const { default: AuthLayout } = await import("../app/(auth)/layout");
const { LoginContent } = await import("../app/(auth)/login/login-content");
const { RegisterContent } = await import("../app/(auth)/register/register-content");
const { Notice } = await import("../app/(auth)/notice");

const params = (value: Record<string, string | string[]>) => Promise.resolve(value);

type SuspenseElement = ReactElement<{ fallback: ReactNode; children: ReactElement<{ searchParams: unknown }> }>;

/** Strona = karta z `<h1>` i `<Suspense>`; zwraca element pod `Suspense`. */
function renderPage(page: ReactElement<{ children: SuspenseElement }>) {
  render(page);
  return page.props.children;
}

describe("strony (auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("layout: nazwa serwisu z linkiem na stronę główną i treść", () => {
    render(AuthLayout({ children: <p>karta</p>, params: Promise.resolve({}) } as LayoutProps<"/">));

    expect(screen.getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/");
    expect(screen.getByText("karta")).toBeInTheDocument();
  });

  it("LoginPage: tytuł, metadata i treść pod Suspense z ładowaniem", () => {
    const searchParams = params({});
    const suspense = renderPage(loginPage.default({ searchParams, params: Promise.resolve({}) } as PageProps<"/login">) as ReactElement<{ children: SuspenseElement }>);

    expect(screen.getByRole("heading", { level: 1, name: "Zaloguj się" })).toBeInTheDocument();
    expect(loginPage.metadata.title).toBe("Zaloguj się — DevMentor");
    expect(suspense.props.children.type).toBe(LoginContent);
    expect(suspense.props.children.props.searchParams).toBe(searchParams);
    render(<>{suspense.props.fallback}</>);
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie…");
  });

  it("RegisterPage: tytuł, metadata i treść pod Suspense", () => {
    const suspense = renderPage(
      registerPage.default({ searchParams: params({}), params: Promise.resolve({}) } as PageProps<"/register">) as ReactElement<{ children: SuspenseElement }>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Załóż konto" })).toBeInTheDocument();
    expect(registerPage.metadata.title).toBe("Załóż konto — DevMentor");
    expect(suspense.props.children.type).toBe(RegisterContent);
  });

  it("AccountPage: tytuł „Konto”, metadata i widok konta", () => {
    render(accountPage.default());

    expect(screen.getByRole("heading", { level: 1, name: "Konto" })).toBeInTheDocument();
    expect(screen.getByText("widok konta")).toBeInTheDocument();
    expect(accountPage.metadata.title).toBe("Konto — DevMentor");
  });

  it("Notice ma rolę status", () => {
    render(<Notice tone="success">Gotowe</Notice>);

    expect(screen.getByRole("status")).toHaveTextContent("Gotowe");
    expect(screen.getByRole("status")).toHaveClass("bg-primary/5");
  });
});

describe("LoginContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bez parametrów: formularz bez next, link do rejestracji, bez komunikatów; sprawdza zalogowanie", async () => {
    render(await LoginContent({ searchParams: params({}) }));

    expect(redirectSignedIn).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId("login-form")).toHaveAttribute("data-next", "");
    expect(screen.getByRole("link", { name: "Załóż konto" })).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("notice=logged_out → „Wylogowano”", async () => {
    render(await LoginContent({ searchParams: params({ notice: "logged_out" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("Wylogowano");
    expect(screen.getByRole("status")).toHaveClass("bg-primary/5");
  });

  it("notice=session_expired → „Sesja wygasła — zaloguj się ponownie”, next przekazany dalej", async () => {
    render(await LoginContent({ searchParams: params({ notice: "session_expired", next: "/admin/outbox" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("Sesja wygasła — zaloguj się ponownie");
    expect(screen.getByRole("status")).toHaveClass("bg-muted");
    expect(redirectSignedIn).toHaveBeenCalledWith("/admin/outbox");
    expect(screen.getByTestId("login-form")).toHaveAttribute("data-next", "/admin/outbox");
    expect(screen.getByRole("link", { name: "Załóż konto" })).toHaveAttribute("href", "/register?next=%2Fadmin%2Foutbox");
  });

  it("nieznany notice → nic", async () => {
    render(await LoginContent({ searchParams: params({ notice: "<script>" }) }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("next=/invite → kontekst zaproszenia (L08)", async () => {
    render(await LoginContent({ searchParams: params({ next: "/invite" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("Po zalogowaniu przyjmiesz zaproszenie do roli mentora.");
  });

  it("złośliwy next → formularz dostaje /", async () => {
    render(await LoginContent({ searchParams: params({ next: "//evil.example" }) }));

    expect(screen.getByTestId("login-form")).toHaveAttribute("data-next", "/");
  });
});

describe("RegisterContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bez next: formularz i link „Zaloguj się” (także przy 409, L19)", async () => {
    render(await RegisterContent({ searchParams: params({}) }));

    expect(redirectSignedIn).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId("register-form")).toHaveAttribute("data-next", "");
    expect(screen.getByRole("link", { name: "Zaloguj się" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("next=/invite → kontekst zaproszenia i next w linku do logowania", async () => {
    render(await RegisterContent({ searchParams: params({ next: "/invite" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("Po zalogowaniu przyjmiesz zaproszenie do roli mentora.");
    expect(screen.getByRole("link", { name: "Zaloguj się" })).toHaveAttribute("href", "/login?next=%2Finvite");
    expect(screen.getByTestId("register-form")).toHaveAttribute("data-next", "/invite");
  });
});
