import { ForbiddenError, UnauthorizedError } from "./errors";
import { getSession } from "./session";

export { getSession };

export type Role = "student" | "mentor" | "admin";

export interface Session {
  userId: string;
  role: Role;
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
