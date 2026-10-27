import { apiHandler, requireSession, withScope } from "@devmentor/core";

// Wyłącznie własne konto: identyfikator pochodzi z sesji, nie z żądania.
export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  return withScope(async ({ accountService }) => accountService.me(session.userId));
});
