import { describe, expect, it, vi } from "vitest";

// Symuluje przyszłą koncepcję auth: getSession zwraca sesję zalogowanego użytkownika.
vi.mock("../src/http/session", () => ({
  getSession: vi.fn(async () => ({ userId: "u1", roles: ["mentee"], emailVerified: false })),
}));

const { requireSession } = await import("../src");

describe("requireSession z aktywną sesją", () => {
  it("zwraca sesję zamiast rzucać", async () => {
    await expect(requireSession(new Request("http://localhost/api/x"))).resolves.toEqual({
      userId: "u1",
      roles: ["mentee"],
      emailVerified: false,
    });
  });
});
