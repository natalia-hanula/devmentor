import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { Button } from "@devmentor/ui/components/ui/button";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { roleStartPath } from "./role-start-path";

export interface AccessDeniedProps {
  /** Zdanie pod tytułem: „Ta strona wymaga roli …” (L09) albo własne, np. dla operatora na `/invite`. */
  message: string;
  roles: readonly string[];
}

/** Widok „Brak dostępu” (s13, L09) — tylko dla zalogowanej osoby; luka DS11: akcje pod `ErrorMessage`. */
export function AccessDenied({ message, roles }: AccessDeniedProps) {
  return (
    <div className="flex flex-col gap-between-groups">
      <ErrorMessage title="Nie masz dostępu do tej strony" message={message} />
      <div className="flex flex-wrap items-center gap-between-groups">
        <Button asChild>
          <Link href={roleStartPath(roles)}>Wróć do swojej strony startowej</Link>
        </Button>
        <LogoutButton variant="link">Zaloguj się innym kontem</LogoutButton>
      </div>
    </div>
  );
}
