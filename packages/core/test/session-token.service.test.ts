import { SignJWT, UnsecuredJWT } from "jose";
import type { JWTPayload } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

const jose = vi.hoisted(() => ({ jwtVerify: vi.fn() }));
vi.mock("jose", async (importOriginal) => {
  const original = await importOriginal<typeof import("jose")>();
  jose.jwtVerify.mockImplementation(original.jwtVerify);
  return { ...original, jwtVerify: jose.jwtVerify };
});

const { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, SessionTokenService } = await import("../src");

const SECRET = "tajny-klucz-sesji-o-dlugosci-ponad-32-bajtow";
const key = new TextEncoder().encode(SECRET);
const subject = { id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b", sessionVersion: 3 };

const service = (appEnv: "local" | "test" | "staging" | "production" = "local", secret = SECRET) =>
  new SessionTokenService({ env: { AUTH_JWT_SECRET: secret, APP_ENV: appEnv } });

function claims(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SessionTokenService.sign / verify", () => {
  it("podpisuje token niosący tylko sub, sv, iat i exp (24 h) i go weryfikuje", async () => {
    const token = await service().sign(subject);

    expect(Object.keys(claims(token)).sort()).toEqual(["exp", "iat", "sub", "sv"]);
    expect(claims(token)).toMatchObject({ sub: subject.id, sv: 3 });
    const { iat, exp } = claims(token) as { iat: number; exp: number };
    expect(exp - iat).toBe(SESSION_TTL_SECONDS);
    expect(await service().verify(token)).toEqual({ userId: subject.id, sessionVersion: 3 });
  });

  it("odrzuca śmieci i token podpisany innym sekretem (rotacja sekretu wylogowuje wszystkich)", async () => {
    const foreign = await service("local", "inny-sekret-sesji-tez-dluzszy-niz-32-bajty").sign(subject);

    expect(await service().verify("to-nie-jest-jwt")).toBeNull();
    expect(await service().verify(foreign)).toBeNull();
  });

  it("odrzuca algorytm inny niż HS256, także alg: none", async () => {
    const hs512 = await new SignJWT({ sv: 1 }).setProtectedHeader({ alg: "HS512" }).setSubject(subject.id).sign(key);
    const none = new UnsecuredJWT({ sv: 1 }).setSubject(subject.id).encode();

    expect(await service().verify(hs512)).toBeNull();
    expect(await service().verify(none)).toBeNull();
  });

  it("odrzuca token wygasły po 24 h, a przed upływem przyjmuje", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    const token = await service().sign(subject);

    vi.setSystemTime(new Date("2026-10-21T09:59:00Z"));
    expect(await service().verify(token)).not.toBeNull();
    vi.setSystemTime(new Date("2026-10-21T10:00:01Z"));
    expect(await service().verify(token)).toBeNull();
  });

  it.each([
    ["brak sub", new SignJWT({ sv: 1 })],
    ["sub nie jest napisem", new SignJWT({ sv: 1, sub: 123 } as unknown as JWTPayload)],
    ["pusty sub", new SignJWT({ sv: 1 }).setSubject("")],
    ["brak sv", new SignJWT({}).setSubject("u1")],
    ["sv nie jest liczbą", new SignJWT({ sv: "1" }).setSubject("u1")],
    ["sv nie jest całkowite", new SignJWT({ sv: 1.5 }).setSubject("u1")],
  ])("odrzuca poprawnie podpisany token: %s", async (_, jwt) => {
    const token = await jwt
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(key);

    expect(await service().verify(token)).toBeNull();
  });

  it("odrzuca poprawnie podpisany token bez exp (requiredClaims)", async () => {
    const token = await new SignJWT({ sv: 1 }).setProtectedHeader({ alg: "HS256" }).setSubject("u1").sign(key);

    expect(await service().verify(token)).toBeNull();
  });

  it("błąd inny niż walidacja tokenu nie jest zamieniany na null", async () => {
    jose.jwtVerify.mockRejectedValueOnce(new Error("awaria"));

    await expect(service().verify("x.y.z")).rejects.toThrow("awaria");
  });
});

describe("SessionTokenService — ciasteczka", () => {
  it("ciasteczko sesji: httpOnly, SameSite=Lax, Path=/, Max-Age=86400", () => {
    expect(service("local").buildSessionCookie("tok")).toBe(
      `${SESSION_COOKIE_NAME}=tok; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`,
    );
  });

  it.each([
    ["local", false],
    ["test", false],
    ["staging", true],
    ["production", true],
  ] as const)("Secure dla APP_ENV=%s: %s", (appEnv, secure) => {
    expect(service(appEnv).buildSessionCookie("tok").endsWith("; Secure")).toBe(secure);
    expect(service(appEnv).clearSessionCookie().endsWith("; Secure")).toBe(secure);
  });

  it("wyczyszczone ciasteczko ma pustą wartość i Max-Age=0", () => {
    expect(service("production").clearSessionCookie()).toBe(
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`,
    );
  });
});
