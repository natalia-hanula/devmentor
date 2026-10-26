"use client";

import { loginSchema, type LoginInput } from "@devmentor/core/validators/auth/login.schema";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms/crud-form";
import { useEnterAccount } from "../use-enter-account";

const FIELDS: CrudFormField<LoginInput>[] = [
  { name: "email", label: "E-mail", type: "email", autoComplete: "username" },
  { name: "password", label: "Hasło", type: "password", autoComplete: "current-password" },
];

export function LoginForm({ next }: { next?: string }) {
  const enterAccount = useEnterAccount("/api/auth/login", next);
  return (
    <CrudForm
      schema={loginSchema}
      fields={FIELDS}
      onSubmit={enterAccount}
      submitLabel="Zaloguj się"
      submittingLabel="Logowanie…"
      errorTitle="Nie udało się zalogować"
      shortcutHint=""
    />
  );
}
