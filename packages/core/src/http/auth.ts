import { ForbiddenError, UnauthorizedError } from "./errors";

export type Role = "student" | "mentor" | "admin";

export interface Session {
  userId: string;
  role: Role;
}

/**
 * Odczyt sesji z żądania. Koncepcja `auth` (JWT w ciasteczku httpOnly) nie jest jeszcze wdrożona,
 * więc sesji nie ma nigdy — każda chroniona trasa odpowiada 401 (fail closed).
 * Wdrożenie auth podmienia wyłącznie ciało tej funkcji.
 */
export async function getSession(request: Request): Promise<Session | null> {
  void request;
  return null;
}

export async function requireSession(request: Request): Promise<Session> {
  const session = await getSession(request);
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export function requireRole(session: Session, role: Role): void {
  if (session.role !== role) {
    throw new ForbiddenError();
  }
}

/** Własność rekordu: student zmienia tylko swoje rezerwacje, mentor tylko swój profil. */
export function assertOwnership(session: Session, ownerId: string): void {
  if (session.userId !== ownerId) {
    throw new ForbiddenError();
  }
}
