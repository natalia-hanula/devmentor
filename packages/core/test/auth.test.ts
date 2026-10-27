import { describe, expect, it, vi } from "vitest";
import {
  assertOwnership,
  ForbiddenError,
  getSession,
  requireRole,
  requireRoleAccess,
  requireSession,
  UnauthorizedError,
  type Session,
} from "../src";

const request = new Request("http://localhost/api/x");
const session: Session = { userId: "u1", roles: ["mentee", "mentor"], emailVerified: true };

describe("auth (przed wdrożeniem koncepcji auth)", () => {
  it("nie ma sesji, więc requireSession zawsze odmawia (fail closed)", async () => {
    expect(await getSession(request)).toBeNull();
    await expect(requireSession(request)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireRole przepuszcza każdą z ról konta i odrzuca brakującą", () => {
    expect(() => requireRole(session, "mentee")).not.toThrow();
    expect(() => requireRole(session, "mentor")).not.toThrow();
    expect(() => requireRole(session, "operator")).toThrow(ForbiddenError);
  });

  it("assertOwnership przepuszcza właściciela i odrzuca innego użytkownika", () => {
    expect(() => assertOwnership(session, "u1")).not.toThrow();
    expect(() => assertOwnership(session, "u2")).toThrow(ForbiddenError);
  });

  it("requireRoleAccess bez sesji odmawia 401 (fail closed)", async () => {
    await expect(requireRoleAccess("operator")(request)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("requireRoleAccess z sesją", () => {
  it("zwraca sesję, gdy ma rolę, i rzuca 403, gdy jej nie ma", async () => {
    vi.resetModules();
    vi.doMock("../src/http/session", () => ({ getSession: vi.fn(async () => session) }));
    const auth = await import("../src/http/auth");
    const errors = await import("../src/http/errors");

    await expect(auth.requireRoleAccess("mentor")(request)).resolves.toEqual(session);
    await expect(auth.requireRoleAccess("operator")(request)).rejects.toBeInstanceOf(errors.ForbiddenError);

    vi.doUnmock("../src/http/session");
  });
});
