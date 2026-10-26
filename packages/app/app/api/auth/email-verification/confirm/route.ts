import { apiHandler, clientIp, parseJsonBody, withScope } from "@devmentor/core";
import { tokenConfirmSchema } from "@devmentor/core/validators/auth/token-confirm.schema";

// Publiczna (sesja nie jest sprawdzana ani zmieniana — L23), z CSRF. Token przychodzi w treści POST,
// nigdy w adresie, więc nie trafia do logów (`apiHandler` loguje tylko ścieżkę).
export const POST = apiHandler(async (request) => {
  const { token } = await parseJsonBody(request, tokenConfirmSchema);
  return withScope(async ({ accountService, env }) =>
    accountService.verifyEmail(token, clientIp(request, { trustProxy: env.TRUST_PROXY })),
  );
});
