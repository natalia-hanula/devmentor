import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

describe("proxy (optymistyczne przekierowanie)", () => {
  it("z ciasteczkiem sesji przepuszcza żądanie (nie sprawdza podpisu)", () => {
    const response = proxy(request("/admin", "devmentor_session=cokolwiek"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("bez ciasteczka przekierowuje na /login z next równym ścieżką i query", () => {
    const response = proxy(request("/admin/technologies?strona=2"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fadmin%2Ftechnologies%3Fstrona%3D2",
    );
  });

  it("inne ciasteczko niż sesyjne nie wystarcza", () => {
    const response = proxy(request("/mentor", "inne=1"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fmentor");
  });

  it("next zawsze przechodzi przez safeNextPath (ścieżka z // nie ucieka z aplikacji)", () => {
    const response = proxy(request("//admin"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2F");
  });

  it("matcher obejmuje /admin, /mentor i /account z podstronami, a nie stronę główną ani API", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/mentor/:path*", "/account/:path*"]);
  });

  it.each([
    ["/account", true],
    ["/account/x", true],
    ["/admin/technologies", true],
    ["/mentor", true],
    ["/accounts", false],
    ["/login", false],
    ["/api/auth/me", false],
    ["/", false],
  ])("proxy działa dla %s: %s", (url, matches) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(matches);
  });
});
