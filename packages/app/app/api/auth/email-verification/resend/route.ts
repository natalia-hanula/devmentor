import { apiHandler, requireSession, withScope } from "@devmentor/core";

// Tylko własne konto (identyfikator z sesji). 200 z `status` (`sent` / `already_verified` / `mail_disabled` / `mail_failed`) —
// strona pokazuje komunikat zależny od wyniku.
export const POST = apiHandler(async (request) => {
  const session = await requireSession(request);
  const status = await withScope(async ({ accountService }) => accountService.resendVerification(session.userId));
  return { status };
});
