import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@devmentor/ui/backend/api/api-call", () => ({ apiCall }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { LoginForm } = await import("../app/(auth)/login/login-form");
const { RegisterForm } = await import("../app/(auth)/register/register-form");

const PASSWORD = "dobre-haslo-123";
const account = (roles: string[]) => ({ ok: true, data: { id: "u1", email: "ola@example.com", roles } });

async function fillLogin() {
  await userEvent.type(screen.getByLabelText("E-mail"), "Ola@Example.com");
  await userEvent.type(screen.getByLabelText("Hasło"), PASSWORD);
  await userEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
}

async function fillRegister(email = "ola@example.com") {
  await userEvent.type(screen.getByLabelText("Wyświetlana nazwa"), "Ola");
  await userEvent.type(screen.getByLabelText("E-mail"), email);
  await userEvent.type(screen.getByLabelText("Hasło"), PASSWORD);
  await userEvent.click(screen.getByRole("button", { name: "Załóż konto" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("pola: e-mail (type=email, autocomplete=username) i hasło (current-password)", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("autocomplete", "current-password");
  });

  it("walidacja klienta tą samą schemą: błędy przy polach, bez wysyłki", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription("Podaj adres e-mail");
    expect(screen.getByLabelText("Hasło")).toHaveAccessibleDescription("Podaj hasło");
    expect(apiCall).not.toHaveBeenCalled();
  });

  it.each([
    [["mentee"], "/account"],
    [["mentee", "mentor"], "/mentor"],
    [["operator"], "/admin/invitations"],
  ])("sukces bez next, role %j → %s (znormalizowany e-mail w żądaniu)", async (roles, path) => {
    apiCall.mockResolvedValue(account(roles));

    render(<LoginForm />);
    await fillLogin();

    expect(apiCall).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      body: { email: "ola@example.com", password: PASSWORD },
    });
    expect(router.replace).toHaveBeenCalledWith(path);
  });

  it("sukces z next → next ma pierwszeństwo", async () => {
    apiCall.mockResolvedValue(account(["operator"]));

    render(<LoginForm next="/admin" />);
    await fillLogin();

    expect(router.replace).toHaveBeenCalledWith("/admin");
  });

  it("401 → ogólny komunikat, pole hasła wyczyszczone, e-mail zostaje, bez przekierowania", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "UNAUTHORIZED", message: "Nieprawidłowy e-mail lub hasło" } });

    render(<LoginForm />);
    await fillLogin();

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zalogować");
    expect(screen.getByRole("alert")).toHaveTextContent("Nieprawidłowy e-mail lub hasło");
    expect(screen.getByLabelText("Hasło")).toHaveValue("");
    expect(screen.getByLabelText("E-mail")).toHaveValue("Ola@Example.com");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("429 → „Za dużo prób. Spróbuj za chwilę.”", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." } });

    render(<LoginForm />);
    await fillLogin();

    expect(await screen.findByRole("alert")).toHaveTextContent("Za dużo prób. Spróbuj za chwilę.");
  });
});

describe("RegisterForm", () => {
  beforeEach(() => {
    apiCall.mockReset();
    router.replace.mockReset();
  });

  it("pola: nazwa (autocomplete=name), e-mail (email), hasło (new-password) z opisem „Min. 12 znaków”", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Wyświetlana nazwa")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Hasło")).toHaveAccessibleDescription("Min. 12 znaków");
  });

  it("za krótkie hasło → błąd przy polu bez wysyłki", async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Wyświetlana nazwa"), "Ola");
    await userEvent.type(screen.getByLabelText("E-mail"), "ola@example.com");
    await userEvent.type(screen.getByLabelText("Hasło"), "krotkie");
    await userEvent.click(screen.getByRole("button", { name: "Załóż konto" }));

    expect(screen.getByLabelText("Hasło")).toHaveAccessibleDescription("Hasło musi mieć co najmniej 12 znaków");
    expect(apiCall).not.toHaveBeenCalled();
  });

  it("sukces bez next → /account (nowe konto mentee)", async () => {
    apiCall.mockResolvedValue({ ...account(["mentee"]) });

    render(<RegisterForm />);
    await fillRegister();

    expect(apiCall).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      body: { displayName: "Ola", email: "ola@example.com", password: PASSWORD },
    });
    expect(router.replace).toHaveBeenCalledWith("/account");
  });

  it("sukces z next=/invite → /invite", async () => {
    apiCall.mockResolvedValue(account(["mentee"]));

    render(<RegisterForm next="/invite" />);
    await fillRegister();

    expect(router.replace).toHaveBeenCalledWith("/invite");
  });

  it("409 → „Ten e-mail ma już konto” przy polu e-mail, hasło wyczyszczone", async () => {
    apiCall.mockResolvedValue({
      ok: false,
      error: { code: "CONFLICT", message: "Ten e-mail ma już konto", fieldErrors: { email: ["Ten e-mail ma już konto"] } },
    });

    render(<RegisterForm />);
    await fillRegister();

    expect(await screen.findByLabelText("E-mail")).toHaveAccessibleDescription("Ten e-mail ma już konto");
    expect(screen.getByLabelText("Hasło")).toHaveValue("");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("429 → komunikat limitu", async () => {
    apiCall.mockResolvedValue({ ok: false, error: { code: "TOO_MANY_REQUESTS", message: "Za dużo prób. Spróbuj za chwilę." } });

    render(<RegisterForm />);
    await fillRegister();

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się założyć konta");
    expect(screen.getByRole("alert")).toHaveTextContent("Za dużo prób. Spróbuj za chwilę.");
  });
});
