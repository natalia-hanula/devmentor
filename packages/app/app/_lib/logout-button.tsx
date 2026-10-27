"use client";

import { apiCall } from "@devmentor/ui/backend/api/api-call";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { Button } from "@devmentor/ui/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { loginPath } from "./login-path";

const LOGOUT_PATH = "/api/auth/logout";

export interface LogoutButtonProps {
  children: ReactNode;
  variant?: "outline" | "link";
}

/**
 * Wylogowanie (L04): `POST /api/auth/logout`, potem `/login` z „Wylogowano”. Używane na `/account`
 * („Wyloguj”) i w „Brak dostępu” („Zaloguj się innym kontem”, L09). Gdy serwer odmówi, zostajemy
 * na stronie z komunikatem — bez wyczyszczonego ciasteczka `/login` odesłałby z powrotem (L05).
 */
export function LogoutButton({ children, variant = "outline" }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setIsPending(true);
    setError(null);
    const result = await apiCall<null>(LOGOUT_PATH, { method: "POST" });
    if (!result.ok) {
      setIsPending(false);
      setError(result.error.message);
      return;
    }
    router.replace(loginPath({ notice: "logged_out" }));
  }

  return (
    <div className="flex flex-col items-start gap-in-group">
      <Button type="button" variant={variant} onClick={logout} disabled={isPending}>
        {children}
      </Button>
      {error && <ErrorMessage title="Nie udało się wylogować" message={error} />}
    </div>
  );
}
