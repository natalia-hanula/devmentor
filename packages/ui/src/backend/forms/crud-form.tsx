"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type HTMLInputAutoCompleteAttribute,
  type KeyboardEvent,
} from "react";
import type { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { ApiResult, FieldErrors } from "../api/types";
import { ErrorMessage } from "../feedback/error-message";

/** Klucz `fieldErrors`, pod którym serwer zwraca błędy całego formularza, a nie pola. */
const FORM_ERROR_KEY = "_form";

type FormValues = Record<string, string>;

interface CrudFormFieldBase<TValues> {
  name: Extract<keyof TValues, string>;
  label: string;
  placeholder?: string;
  description?: string;
}

/**
 * Pole hasła wymaga `autoComplete`, bo logowanie (`current-password`) i rejestracja (`new-password`)
 * potrzebują różnych wartości, a pominięcie psuje menedżery haseł bez żadnego sygnału (DS01).
 */
export type CrudFormField<TValues> = CrudFormFieldBase<TValues> &
  (
    | { type?: "text" | "textarea" | "email"; autoComplete?: HTMLInputAutoCompleteAttribute }
    | { type: "password"; autoComplete: HTMLInputAutoCompleteAttribute }
  );

export interface CrudFormProps<TValues extends Record<string, unknown>> {
  /** Ta sama schema Zod, której używa trasa API (`@devmentor/core/validators/...`). */
  schema: z.ZodType<TValues>;
  fields: CrudFormField<TValues>[];
  /**
   * Pola `type: "password"` nie przyjmują wartości początkowej (startują puste). Wpisane hasło żyje
   * w stanie i w DOM-ie, dopóki formularz go nie wyczyści: po sukcesie i po wyjątku przy wysyłce.
   */
  initialValues?: Partial<Record<keyof TValues, string>>;
  onSubmit: (values: TValues) => Promise<ApiResult<unknown>>;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  /** Teksty zależne od przepływu (np. logowanie zamiast zapisu). */
  submittingLabel?: string;
  errorTitle?: string;
  shortcutHint?: string;
  /** Komunikat, gdy `onSubmit` rzuci wyjątek (np. brak sieci) zamiast zwrócić kopertę z błędem. */
  unexpectedErrorMessage?: string;
}

/**
 * Formularz sterowany schematem: walidacja po stronie klienta tą samą schemą co serwer,
 * błędy serwera (`fieldErrors`) przy właściwych polach, Cmd/Ctrl+Enter wysyła, Escape anuluje.
 */
export function CrudForm<TValues extends Record<string, unknown>>({
  schema,
  fields,
  initialValues,
  onSubmit,
  onSuccess,
  onCancel,
  submitLabel = "Zapisz",
  submittingLabel = "Zapisywanie…",
  errorTitle = "Nie zapisano",
  shortcutHint = "Ctrl/⌘ + Enter, aby zapisać",
  unexpectedErrorMessage = "Nie udało się połączyć. Spróbuj ponownie.",
}: CrudFormProps<TValues>) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const emptyValues = Object.fromEntries(
    fields.map((field) => [field.name, field.type === "password" ? "" : (initialValues?.[field.name] ?? "")]),
  ) as FormValues;
  const emptyPasswords = Object.fromEntries(
    fields.filter((field) => field.type === "password").map((field) => [field.name, ""]),
  ) as FormValues;
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      showErrors(toFieldErrors(parsed.error), null);
      return;
    }

    setIsSubmitting(true);
    let result: ApiResult<unknown>;
    try {
      result = await onSubmit(parsed.data);
    } catch {
      // Po wyjątku (np. brak sieci) nie wiemy, co serwer zrobił z hasłem — nie trzymamy go dłużej
      // w formularzu; pozostałe pola zostają, żeby dało się ponowić wysyłkę.
      setValues((current) => ({ ...current, ...emptyPasswords }));
      showErrors({}, unexpectedErrorMessage);
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (!result.ok) {
      showErrors(result.error.fieldErrors ?? {}, result.error.message);
      return;
    }

    setFieldErrors({});
    setValues(emptyValues);
    onSuccess?.();
  }

  /** Błędy pól przy polach, błędy całego formularza (klucz `_form`) — nad formularzem. */
  function showErrors(errors: FieldErrors, fallbackFormError: string | null) {
    const { [FORM_ERROR_KEY]: formLevel, ...perField } = errors;
    setFieldErrors(perField);
    setFormError(formLevel?.join(" ") ?? fallbackFormError);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex flex-col gap-4">
      {formError && <ErrorMessage title={errorTitle} message={formError} />}
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        const describedBy = errors ? `${inputId}-error` : field.description ? `${inputId}-description` : undefined;
        const commonProps = {
          id: inputId,
          name: field.name,
          value: values[field.name],
          placeholder: field.placeholder,
          autoComplete: field.autoComplete,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": describedBy,
          onChange: (event: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [field.name]: event.target.value })),
        };

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>{field.label}</Label>
            {field.type === "textarea" ? <Textarea {...commonProps} /> : <Input type={field.type} {...commonProps} />}
            {errors ? (
              <p id={`${inputId}-error`} className="text-sm text-destructive">
                {errors.join(" ")}
              </p>
            ) : (
              field.description && (
                <p id={`${inputId}-description`} className="text-sm text-muted-foreground">
                  {field.description}
                </p>
              )
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Anuluj
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{shortcutHint}</span>
      </div>
    </form>
  );
}

function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : FORM_ERROR_KEY;
    (result[key] ??= []).push(issue.message);
  }
  return result;
}
