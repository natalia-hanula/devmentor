import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/account" }));

const { useSessionExpiredRedirect } = await import("../app/_lib/use-session-expired-redirect");

describe("useSessionExpiredRedirect (decyzja 17)", () => {
  beforeEach(() => {
    router.replace.mockReset();
  });

  it("401 → /login z next = bieżąca ścieżka i notice=session_expired; zwraca true", () => {
    const { result } = renderHook(() => useSessionExpiredRedirect());

    expect(result.current({ ok: false, error: { code: "UNAUTHORIZED", message: "Wymagane zalogowanie" } })).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/login?next=%2Faccount&notice=session_expired");
  });

  it.each([
    ["sukces", { ok: true as const, data: null }],
    ["403", { ok: false as const, error: { code: "FORBIDDEN", message: "Brak uprawnień" } }],
    ["503", { ok: false as const, error: { code: "SERVICE_UNAVAILABLE", message: "Baza danych jest niedostępna" } }],
  ])("%s → bez przekierowania, zwraca false", (_name, apiResult) => {
    const { result } = renderHook(() => useSessionExpiredRedirect());

    expect(result.current(apiResult)).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
