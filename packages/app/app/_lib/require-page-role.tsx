import { getSessionFromCookieValue, safeNextPath, SESSION_COOKIE_NAME, type Role } from "@devmentor/core";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactElement, type ReactNode } from "react";

/** Rola w dopełniaczu — do zdania „Ta strona wymaga roli …” (L09). */
const ROLE_LABELS: Record<Role, string> = {
  mentee: "mentee",
  mentor: "mentora",
  operator: "operatora",
};

/**
 * Bramka roli dla strony (Server Component): bez sesji przekierowuje do `/login?next=<path>`,
 * z sesją bez roli zwraca widok „Brak dostępu”, a gdy wszystko się zgadza — `null`.
 * Sprawdzenie jest tu, przy danych, a nie w layoucie: layout nie renderuje się ponownie przy nawigacji.
 * Autorytetem pozostaje API (403) — strona tylko nie pokazuje danych. Bez `forbidden()`: wymaga
 * eksperymentalnej flagi `authInterrupts`, a takiej do bramki bezpieczeństwa nie włączamy.
 */
export async function requirePageRole(role: Role, path: string): Promise<ReactElement | null> {
  await connection();
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await getSessionFromCookieValue(sessionCookie);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(safeNextPath(path))}`);
  }
  if (!session.roles.includes(role)) {
    return <ErrorMessage title="Nie masz dostępu do tej strony" message={`Ta strona wymaga roli ${ROLE_LABELS[role]}.`} />;
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
