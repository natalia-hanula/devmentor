import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import type { ApiResult, FieldErrors } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { Button } from "@devmentor/ui/components/ui/button";
import { Input } from "@devmentor/ui/components/ui/input";
import { Label } from "@devmentor/ui/components/ui/label";

// LUKA DS01: CrudForm ma tylko pola text/textarea, a logowanie i rejestracja potrzebują pól e-mail i hasła
// z `autocomplete` (decyzja L24: rozszerzenie CrudForm to osobne zadanie przed implementacją E01).
// Tu najprostsza kopia zachowania CrudForm z tych samych prymitywów: walidacja schemą Zod, błędy serwera
// przy polach, błąd formularza nad polami, wpisane dane zostają po błędzie.

export interface AuthFieldDef {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  description?: string;
}

export interface AuthFormProps<TValues extends Record<string, string>> {
  fields: AuthFieldDef[];
  schema: z.ZodType<TValues>;
  initialValues?: Partial<Record<string, string>>;
  submitLabel: string;
  submittingLabel: string;
  formErrorTitle: string;
  /** Wymuszony stan wysyłania (skrót recenzenta do stanu „wysyłanie”). */
  forcedSubmitting?: boolean;
  onSubmit: (values: TValues) => Promise<ApiResult<unknown>>;
  children?: ReactNode;
}

const FORM_ERROR_KEY = "_form";

export function AuthForm<TValues extends Record<string, string>>({
  fields,
  schema,
  initialValues,
  submitLabel,
  submittingLabel,
  formErrorTitle,
  forcedSubmitting = false,
  onSubmit,
  children,
}: AuthFormProps<TValues>) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, initialValues?.[field.name] ?? ""])),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = isSubmitting || forcedSubmitting;

  function focusFirstInvalid(errors: FieldErrors) {
    const first = fields.find((field) => errors[field.name]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first.name}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.length ? issue.path.join(".") : FORM_ERROR_KEY;
        (errors[key] ??= []).push(issue.message);
      }
      setFieldErrors(errors);
      focusFirstInvalid(errors);
      return;
    }
    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    setIsSubmitting(false);
    if (!result.ok) {
      const errors = result.error.fieldErrors ?? {};
      setFieldErrors(errors);
      setFormError(Object.keys(errors).length ? null : result.error.message);
      focusFirstInvalid(errors);
      return;
    }
    setFieldErrors({});
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-between-groups">
      {formError && <ErrorMessage title={formErrorTitle} message={formError} />}
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        const describedBy = [errors && `${inputId}-error`, field.description && `${inputId}-description`]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={field.name} className="flex flex-col gap-in-group">
            <Label htmlFor={inputId}>{field.label}</Label>
            <Input
              id={inputId}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              aria-invalid={errors ? true : undefined}
              aria-describedby={describedBy || undefined}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
            {field.description && (
              <p id={`${inputId}-description`} className="text-meta text-muted-foreground">
                {field.description}
              </p>
            )}
            {errors && (
              <p id={`${inputId}-error`} className="text-body text-destructive">
                {errors.join(" ")}
              </p>
            )}
          </div>
        );
      })}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? submittingLabel : submitLabel}
      </Button>
      {children}
    </form>
  );
}
