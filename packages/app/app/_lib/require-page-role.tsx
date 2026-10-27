import { getSessionFromCookieValue, SESSION_COOKIE_NAME, type Role } from "@devmentor/core";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { AccessDenied } from "./access-denied";
import { loginPath } from "./login-path";

/** Rola w dopełniaczu — do zdania „Ta strona wymaga roli …” (L09). */
const ROLE_LABELS: Record<Role, string> = {
  mentee: "mentee",
  mentor: "mentora",
  operator: "operatora",
};

/**
 * Bramka roli dla strony (Server Component): bez sesji przekierowuje do `/login?next=<path>`,
 * z sesją bez roli zwraca widok „Brak dostępu” (L09), a gdy wszystko się zgadza — `null`.
 * Ciasteczko jest, a sesji nie ma (wygasła, podbita `session_version`, usunięte konto) → dodatkowo
 * `notice=session_expired` (decyzja 17, L07). Ciasteczko usunięte przez przeglądarkę po wygaśnięciu
 * wygląda jak brak logowania — wtedy bez komunikatu (znane ograniczenie).
 * Sprawdzenie jest tu, przy danych, a nie w layoucie: layout nie renderuje się ponownie przy nawigacji.
 * Autorytetem pozostaje API (403) — strona tylko nie pokazuje danych. Bez `forbidden()`: wymaga
 * eksperymentalnej flagi `authInterrupts`, a takiej do bramki bezpieczeństwa nie włączamy.
 */
export async function requirePageRole(role: Role, path: string): Promise<ReactElement | null> {
  await connection();
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await getSessionFromCookieValue(sessionCookie);
  if (!session) {
    redirect(loginPath({ next: path, notice: sessionCookie ? "session_expired" : undefined }));
  }
  if (!session.roles.includes(role)) {
    return <AccessDenied message={`Ta strona wymaga roli ${ROLE_LABELS[role]}.`} roles={session.roles} />;
  }
  return null;
}

interface PageRoleGateProps {
  role: Role;
  /** Ścieżka strony — wraca do niej logowanie (`next`). */
  path: string;
  children: ReactNode;
}

/** Strona opakowuje w to całą treść: dostęp do ciasteczek i bazy dzieje się pod `<Suspense>` (`cacheComponents`). */
export function PageRoleGate(props: PageRoleGateProps) {
  return (
    <Suspense fallback={<LoadingMessage />}>
      <RoleGate {...props} />
    </Suspense>
  );
}

export async function RoleGate({ role, path, children }: PageRoleGateProps) {
  return (await requirePageRole(role, path)) ?? children;
}
