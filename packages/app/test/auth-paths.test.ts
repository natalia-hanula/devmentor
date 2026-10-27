import { describe, expect, it } from "vitest";
import { LOGIN_NOTICES, loginNoticeText, loginPath } from "../app/_lib/login-path";
import { ROLE_START_PATHS, roleStartPath } from "../app/_lib/role-start-path";

describe("roleStartPath (L03)", () => {
  it.each([
    [["mentee"], "/account"],
    [["mentee", "mentor"], "/mentor"],
    [["mentor"], "/mentor"],
    [["operator"], "/admin/invitations"],
    [["mentee", "mentor", "operator"], "/admin/invitations"],
    [[], "/account"],
  ])("role %j → %s", (roles, path) => {
    expect(roleStartPath(roles)).toBe(path);
  });

  it("strony startowe zgodne z mapą ekranów", () => {
    expect(ROLE_START_PATHS).toEqual({ operator: "/admin/invitations", mentor: "/mentor", mentee: "/account" });
  });
});

describe("loginPath", () => {
  it("koduje next i dokleja komunikat z listy", () => {
    expect(loginPath({ next: "/admin/technologies?x=1", notice: "session_expired" })).toBe(
      "/login?next=%2Fadmin%2Ftechnologies%3Fx%3D1&notice=session_expired",
    );
  });

  it("sam komunikat — bez next", () => {
    expect(loginPath({ notice: "logged_out" })).toBe("/login?notice=logged_out");
  });

  it("złośliwy next zamienia na / (safeNextPath)", () => {
    expect(loginPath({ next: "//evil.pl" })).toBe("/login?next=%2F");
  });
});

describe("loginNoticeText — zamknięta lista (L04, L07)", () => {
  it("zna obie wartości", () => {
    expect(loginNoticeText("logged_out")).toBe("Wylogowano");
    expect(loginNoticeText("session_expired")).toBe("Sesja wygasła — zaloguj się ponownie");
    expect(Object.keys(LOGIN_NOTICES)).toEqual(["logged_out", "session_expired"]);
  });

  it.each([undefined, "", "inne", "__proto__", "toString", "constructor"])("nieznana wartość %j → null", (value) => {
    expect(loginNoticeText(value)).toBeNull();
  });
});
