import { apiHandler, clientIp, parseJsonBody, requireSession, withScope } from "@devmentor/core";
import { tokenConfirmSchema } from "@devmentor/core/validators/auth/token-confirm.schema";

// Zalogowane konto przyjmuje zaproszenie dla siebie (id z sesji, nie z żądania); operator dostaje 403 w serwisie.
// Token przychodzi w treści POST, nigdy w adresie, więc nie trafia do logów (`apiHandler` loguje tylko ścieżkę).
export const POST = apiHandler(async (request) => {
  const session = await requireSession(request);
  const { token } = await parseJsonBody(request, tokenConfirmSchema);
  return withScope(async ({ invitationService, env }) =>
    invitationService.accept(session.userId, token, clientIp(request, { trustProxy: env.TRUST_PROXY })),
  );
});
