import { apiHandler, clientIp, parseJsonBody, withCookies, withScope } from "@devmentor/core";
import { registerSchema } from "@devmentor/core/validators/auth/register.schema";

// Publiczna, ale z CSRF (POST). Do serwisu trafia tylko sparsowany kształt Zod; konto od razu zalogowane.
export const POST = apiHandler(
  async (request) => {
    const input = await parseJsonBody(request, registerSchema);
    return withScope(async ({ accountService, sessionTokenService, env }) => {
      const { account, session } = await accountService.register(input, clientIp(request, { trustProxy: env.TRUST_PROXY }));
      const token = await sessionTokenService.sign(session);
      return withCookies(account, [sessionTokenService.buildSessionCookie(token)]);
    });
  },
  { successStatus: 201 },
);
