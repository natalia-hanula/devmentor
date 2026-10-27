import { apiHandler, parseUuidParam, requireRole, requireSession, withScope } from "@devmentor/core";

// Odebranie roli mentora (Q16): tylko operator; sesja (401) → rola (403) przed walidacją i serwisem.
export const DELETE = apiHandler(async (request) => {
  requireRole(await requireSession(request), "operator");
  const userId = parseUuidParam(request, "userId");
  await withScope(async ({ invitationService }) => invitationService.removeMentorRole(userId));
  return { userId };
});
