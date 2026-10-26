import { apiHandler, withCookies, withScope } from "@devmentor/core";

// Publiczna i idempotentna (także bez sesji): czyści ciasteczko sesji. CSRF jak przy każdym POST.
export const POST = apiHandler(async () =>
  withScope(async ({ sessionTokenService }) => withCookies(null, [sessionTokenService.clearSessionCookie()])),
);
