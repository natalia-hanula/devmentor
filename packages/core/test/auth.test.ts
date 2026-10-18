import { describe, expect, it } from "vitest";
import {
  assertOwnership,
  ForbiddenError,
  getSession,
  requireRole,
  requireSession,
  UnauthorizedError,
  type Session,
} from "../src";

const request = new Request("http://localhost/api/x");
const session: Session = { userId: "u1", role: "mentor" };

describe("auth (przed wdrożeniem koncepcji auth)", () => {
  it("nie ma sesji, więc requireSession zawsze odmawia (fail closed)", async () => {
    expect(await getSession(request)).toBeNull();
    await expect(requireSession(request)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireRole przepuszcza właściwą rolę i odrzuca inną", () => {
    expect(() => requireRole(session, "mentor")).not.toThrow();
    expect(() => requireRole(session, "admin")).toThrow(ForbiddenError);
  });

  it("assertOwnership przepuszcza właściciela i odrzuca innego użytkownika", () => {
    expect(() => assertOwnership(session, "u1")).not.toThrow();
    expect(() => assertOwnership(session, "u2")).toThrow(ForbiddenError);
  });
});
