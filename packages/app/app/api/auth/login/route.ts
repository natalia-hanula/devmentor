import { apiHandler, clientIp, parseJsonBody, withCookies, withScope } from "@devmentor/core";
import { loginSchema } from "@devmentor/core/validators/auth/login.schema";

// Publiczna, ale z CSRF (POST). Limiter i jeden komunikat błędu dla każdej przyczyny — w `AccountService.login`.
export const POST = apiHandler(async (request) => {
  const input = await parseJsonBody(request, loginSchema);
  return withScope(async ({ accountService, sessionTokenService, env }) => {
    const { account, session } = await accountService.login(input, clientIp(request, { trustProxy: env.TRUST_PROXY }));
    const token = await sessionTokenService.sign(session);
    return withCookies(account, [sessionTokenService.buildSessionCookie(token)]);
  });
});
