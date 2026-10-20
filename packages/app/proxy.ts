import { safeNextPath } from "@devmentor/core/http/safe-next-path";
import { SESSION_COOKIE_NAME } from "@devmentor/core/http/session-constants";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optymistyczne przekierowanie: bez ciasteczka sesji gość od razu trafia na `/login?next=…`.
 * To tylko wygoda — nie sprawdza podpisu ani bazy (Proxy działa też przy prefetchu). Autorytetem
 * są `requirePageRole` na stronach i `requireRole*` w API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", safeNextPath(request.nextUrl.pathname + request.nextUrl.search));
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/mentor/:path*", "/account"],
};
