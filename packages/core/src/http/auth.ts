import type { AccessRule } from "./make-crud-route";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { getSession } from "./session";

export { getSession };

export type Role = "mentee" | "mentor" | "operator";

export interface Session {
  userId: string;
  roles: readonly Role[];
  emailVerified: boolean;
}

export async function requireSession(request: Request): Promise<Session> {
  const session = await getSession(request);
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export function requireRole(session: Session, role: Role): void {
  if (!session.roles.includes(role)) {
    throw new ForbiddenError();
  }
}

/** `AccessRule` dla `makeCrudRoute`: wymaga sesji (401) i roli (403). */
export function requireRoleAccess(role: Role): Exclude<AccessRule, "public"> {
  return async (request) => {
    const session = await requireSession(request);
    requireRole(session, role);
    return session;
  };
}

/** Własność rekordu: mentee zmienia tylko swoje rezerwacje, mentor tylko swój profil. */
export function assertOwnership(session: Session, ownerId: string): void {
  if (session.userId !== ownerId) {
    throw new ForbiddenError();
  }
}
