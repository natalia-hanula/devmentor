import { beforeEach, describe, expect, it, vi } from "vitest";

const logger = { error: vi.fn() };
vi.mock("../src/logger", () => ({ getLogger: () => logger }));

const { AppError, redirectHandler, withCookies, ForbiddenError, ServiceUnavailableError } = await import("../src");

const context = { params: Promise.resolve({}) };
const get = (url = "http://localhost/api/auth/github/callback") => new Request(url);

describe("redirectHandler", () => {
  beforeEach(() => {
    logger.error.mockReset();
  });

  it("zwraca 302 na adres z handlera, bez ciała", async () => {
    const response = await redirectHandler(async () => "/mentor")(get(), context);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/mentor");
    expect(await response.text()).toBe("");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("withCookies dokleja każde ciasteczko jako osobny Set-Cookie", async () => {
    const handler = redirectHandler(async () => withCookies("/account", ["a=1; Path=/", "b=2; Path=/"]));

    const response = await handler(get(), context);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/account");
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])("%s → 405 z Allow: GET, handler się nie wykonuje", async (method) => {
    const handler = vi.fn(async () => "/x");

    const response = await redirectHandler(handler)(new Request("http://localhost/api/x", { method }), context);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(handler).not.toHaveBeenCalled();
  });

  it("AppError → /login?error=<kod>; błąd 4xx nie jest logowany", async () => {
    const response = await redirectHandler(async () => {
      throw new ForbiddenError();
    })(get(), context);

    expect(response.headers.get("location")).toBe("/login?error=FORBIDDEN");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("AppError 5xx jest logowany, w logu tylko pathname", async () => {
    const response = await redirectHandler(async () => {
      throw new ServiceUnavailableError("Poczta niedostępna");
    })(get("http://localhost/api/auth/github/callback?code=SEKRET&state=STAN"), context);

    expect(response.headers.get("location")).toBe("/login?error=SERVICE_UNAVAILABLE");
    expect(logger.error).toHaveBeenCalledOnce();
    expect(JSON.stringify(logger.error.mock.calls)).toContain("/api/auth/github/callback");
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(/SEKRET|STAN|code=/);
  });

  it("niedostępna baza → /login?error=SERVICE_UNAVAILABLE i log błędu", async () => {
    const { initOrm, Technology } = await import("@devmentor/db");
    const orm = await initOrm("postgresql://devmentor:devmentor@127.0.0.1:1/devmentor");
    const handler = redirectHandler(async () => {
      await orm.em.fork().find(Technology, {});
      return "/x";
    });

    try {
      const response = await handler(get(), context);

      expect(response.headers.get("location")).toBe("/login?error=SERVICE_UNAVAILABLE");
      expect(logger.error).toHaveBeenCalledOnce();
    } finally {
      await orm.close(true);
    }
  });

  it("nieoczekiwany błąd → /login?error=unexpected, log bez ujawniania wiadomości w adresie", async () => {
    const response = await redirectHandler(async () => {
      throw new Error("sekretny szczegół");
    })(get("http://localhost/api/x?token=abc"), context);

    expect(response.headers.get("location")).toBe("/login?error=unexpected");
    expect(response.headers.get("location")).not.toContain("sekretny");
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("token=abc");
  });

  it("kod błędu jest kodowany w adresie", async () => {
    class OddError extends AppError {
      readonly status = 400;
      readonly code = "ZŁY KOD&x=1";
    }

    const response = await redirectHandler(async () => {
      throw new OddError("x");
    })(get(), context);

    expect(response.headers.get("location")).toBe(`/login?error=${encodeURIComponent("ZŁY KOD&x=1")}`);
  });
});
