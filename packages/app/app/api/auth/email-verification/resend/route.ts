import { apiHandler, requireSession, withScope } from "@devmentor/core";

// Tylko własne konto (identyfikator z sesji). 200 także przy potwierdzonym adresie — wtedy nic nie wysyła.
export const POST = apiHandler(async (request) => {
  const session = await requireSession(request);
  await withScope(async ({ accountService }) => accountService.resendVerification(session.userId));
  return null;
});
