"use client";

import { registerSchema, type RegisterInput } from "@devmentor/core/validators/auth/register.schema";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms/crud-form";
import { useEnterAccount } from "../use-enter-account";

const FIELDS: CrudFormField<RegisterInput>[] = [
  { name: "displayName", label: "Wyświetlana nazwa", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Hasło", type: "password", autoComplete: "new-password", description: "Min. 12 znaków" },
];

export function RegisterForm({ next }: { next?: string }) {
  const enterAccount = useEnterAccount("/api/auth/register", next);
  return (
    <CrudForm
      schema={registerSchema}
      fields={FIELDS}
      onSubmit={enterAccount}
      submitLabel="Załóż konto"
      submittingLabel="Zakładanie konta…"
      errorTitle="Nie udało się założyć konta"
      shortcutHint=""
    />
  );
}
