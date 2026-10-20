import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiResult } from "../src/backend/api/types";
import { CrudForm, type CrudFormField } from "../src/backend/forms/crud-form";

const schema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę"),
  bio: z.string().max(5, "Za długie"),
});
type Values = z.infer<typeof schema>;

const fields: CrudFormField<Values>[] = [
  { name: "name", label: "Nazwa", placeholder: "np. Go", description: "Krótka nazwa" },
  { name: "bio", label: "Opis", type: "textarea" },
];

const ok: ApiResult<unknown> = { ok: true, data: null };

function renderForm(props: Partial<Parameters<typeof CrudForm<Values>>[0]> = {}) {
  const onSubmit = vi.fn(async () => ok);
  render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

describe("CrudForm", () => {
  it("renderuje pola z etykietami, opisem i textarea; domyślny przycisk „Zapisz”", () => {
    renderForm();

    expect(screen.getByLabelText("Nazwa")).toHaveAttribute("placeholder", "np. Go");
    expect(screen.getByLabelText("Nazwa")).toHaveAccessibleDescription("Krótka nazwa");
    expect(screen.getByLabelText("Opis").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Opis")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anuluj" })).not.toBeInTheDocument();
  });

  it("waliduje po stronie klienta tą samą schemą i nie wysyła błędnych danych", async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText("Opis"), "za długi opis");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Podaj nazwę")).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Nazwa")).toHaveAccessibleDescription("Podaj nazwę");
    expect(screen.queryByText("Krótka nazwa")).not.toBeInTheDocument();
    expect(screen.getByText("Za długie")).toBeInTheDocument();
  });

  it("pokazuje błąd całego formularza z walidacji klienta", async () => {
    const refined = schema.refine((values) => values.name !== values.bio, { message: "Nazwa i opis muszą się różnić" });
    renderForm({ schema: refined });

    await userEvent.type(screen.getByLabelText("Nazwa"), "Go");
    await userEvent.type(screen.getByLabelText("Opis"), "Go");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Nazwa i opis muszą się różnić");
  });

  it("wysyła sparsowane wartości, czyści formularz i woła onSuccess", async () => {
    const onSuccess = vi.fn();
    const { onSubmit } = renderForm({ onSuccess, initialValues: { name: "  Go " }, submitLabel: "Dodaj" });

    expect(screen.getByLabelText("Nazwa")).toHaveValue("  Go ");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Go", bio: "" });
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Nazwa")).toHaveValue("  Go ");
  });

  it("działa bez onSuccess", async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText("Nazwa"), "Go");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Nazwa")).toHaveValue("");
  });

  it("pokazuje błędy serwera przy polach i błąd ogólny z klucza _form", async () => {
    const onSubmit = vi.fn(
      async (): Promise<ApiResult<unknown>> => ({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Nieprawidłowe dane",
          fieldErrors: { name: ["Nazwa zajęta"], _form: ["Spróbuj innej nazwy"] },
        },
      }),
    );
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText("Nazwa"), "Go");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(screen.getByText("Nazwa zajęta")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Spróbuj innej nazwy");
    expect(screen.getByLabelText("Nazwa")).toHaveValue("Go");
  });

  it("bez fieldErrors pokazuje komunikat błędu z serwera", async () => {
    const onSubmit = vi.fn(
      async (): Promise<ApiResult<unknown>> => ({ ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } }),
    );
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText("Nazwa"), "Go");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Nie zapisano");
    expect(screen.getByRole("alert")).toHaveTextContent("Wymagane zalogowanie");
  });

  it("blokuje ponowne wysłanie w trakcie zapisu i pokazuje „Zapisywanie…”", async () => {
    let resolve: (value: ApiResult<unknown>) => void = () => undefined;
    const onSubmit = vi.fn(() => new Promise<ApiResult<unknown>>((r) => (resolve = r)));
    renderForm({ onSubmit, initialValues: { name: "Go" } });
    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form")!;

    fireEvent.submit(form);
    expect(await screen.findByRole("button", { name: "Zapisywanie…" })).toBeDisabled();
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledOnce();
    await act(async () => resolve(ok));
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeEnabled();
  });

  it("Ctrl+Enter i ⌘+Enter wysyłają formularz, zwykły Enter w textarea nie", async () => {
    const { onSubmit } = renderForm({ initialValues: { name: "Go" } });
    const bio = screen.getByLabelText("Opis");

    fireEvent.keyDown(bio, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(bio, { key: "Enter", ctrlKey: true });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("Nazwa"), "Rust");
    fireEvent.keyDown(bio, { key: "Enter", metaKey: true });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });

  it("Escape i przycisk „Anuluj” wołają onCancel; bez onCancel Escape nic nie robi", async () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });

    fireEvent.keyDown(screen.getByLabelText("Nazwa"), { key: "Escape" });
    await userEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("Escape bez onCancel nie zmienia stanu formularza", () => {
    renderForm({ initialValues: { name: "Go" } });

    fireEvent.keyDown(screen.getByLabelText("Nazwa"), { key: "Escape" });

    expect(screen.getByLabelText("Nazwa")).toHaveValue("Go");
  });
});

describe("CrudForm — pola e-mail i hasło (DS01)", () => {
  const credentialsSchema = z.object({
    email: z.string().email("Podaj poprawny adres e-mail"),
    password: z.string().min(1, "Podaj hasło"),
  });
  type Credentials = z.infer<typeof credentialsSchema>;

  function renderCredentials(
    credentialFields: CrudFormField<Credentials>[],
    onSubmit = vi.fn(async (): Promise<ApiResult<unknown>> => ok),
  ) {
    render(<CrudForm schema={credentialsSchema} fields={credentialFields} onSubmit={onSubmit} submitLabel="Zaloguj" />);
    return { onSubmit };
  }

  it("logowanie: e-mail z type=email i autocomplete=username, hasło z type=password i current-password", () => {
    renderCredentials([
      { name: "email", label: "E-mail", type: "email", autoComplete: "username" },
      { name: "password", label: "Hasło", type: "password", autoComplete: "current-password" },
    ]);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("autocomplete", "current-password");
  });

  it("rejestracja: autocomplete=email i new-password", () => {
    renderCredentials([
      { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
      { name: "password", label: "Hasło", type: "password", autoComplete: "new-password" },
    ]);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("autocomplete", "new-password");
  });

  it("bez autoComplete nie renderuje atrybutu autocomplete; pole bez typu nie dostaje atrybutu type", () => {
    renderCredentials([
      { name: "email", label: "E-mail", type: "email" },
      { name: "password", label: "Hasło", type: "password" },
    ]);

    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("autocomplete");
    expect(screen.getByLabelText("Hasło")).not.toHaveAttribute("autocomplete");
    cleanup();

    renderForm();
    expect(screen.getByLabelText("Nazwa")).not.toHaveAttribute("type");
    expect(screen.getByLabelText("Nazwa")).not.toHaveAttribute("autocomplete");
    expect(screen.getByLabelText("Opis")).not.toHaveAttribute("autocomplete");
  });

  it("textarea przekazuje autoComplete", () => {
    render(
      <CrudForm
        schema={schema}
        fields={[
          { name: "name", label: "Nazwa", type: "text", autoComplete: "name" },
          { name: "bio", label: "Opis", type: "textarea", autoComplete: "off" },
        ]}
        onSubmit={vi.fn(async () => ok)}
      />,
    );

    expect(screen.getByLabelText("Nazwa")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Nazwa")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Opis")).toHaveAttribute("autocomplete", "off");
  });

  it("błąd serwera przy polu hasła jest powiązany przez aria-describedby, wartość hasła zostaje", async () => {
    const onSubmit = vi.fn(
      async (): Promise<ApiResult<unknown>> => ({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Nieprawidłowe dane", fieldErrors: { password: ["Hasło jest za krótkie"] } },
      }),
    );
    renderCredentials(
      [
        { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
        { name: "password", label: "Hasło", type: "password", autoComplete: "new-password" },
      ],
      onSubmit,
    );

    await userEvent.type(screen.getByLabelText("E-mail"), "ola@example.com");
    await userEvent.type(screen.getByLabelText("Hasło"), "krotkie");
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj" }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "ola@example.com", password: "krotkie" });
    const password = screen.getByLabelText("Hasło");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Hasło jest za krótkie");
    expect(password).toHaveValue("krotkie");
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-describedby");
  });
});
