import { apiHandler, getSession, withCookies, withScope } from "@devmentor/core";

// Publiczna i idempotentna (także bez sesji): czyści ciasteczko, a przy ważnej sesji podbija `session_version`,
// żeby skopiowany token przestał działać. CSRF jak przy każdym POST.
export const POST = apiHandler(async (request) => {
  const session = await getSession(request);
  return withScope(async ({ accountService, sessionTokenService }) => {
    if (session) {
      await accountService.logout(session.userId);
    }
    return withCookies(null, [sessionTokenService.clearSessionCookie()]);
  });
});
