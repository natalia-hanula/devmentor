import {
  apiHandler,
  parseIdQuery,
  parseJsonBody,
  requireRole,
  requireSession,
  withScope,
} from "@devmentor/core";
import { invitationCreateSchema } from "@devmentor/core/validators/auth/invitation-create.schema";

// Tylko operator: sesja (401) → rola (403), zanim ruszy walidacja czy serwis. `link` z surowym tokenem
// jest wyłącznie w odpowiedzi `POST`; token nie trafia do logów (`apiHandler` loguje tylko błąd i `METODA ścieżka`).
export const GET = apiHandler(async (request) => {
  requireRole(await requireSession(request), "operator");
  return withScope(async ({ invitationService }) => invitationService.list());
});

export const POST = apiHandler(
  async (request) => {
    const session = await requireSession(request);
    requireRole(session, "operator");
    const input = await parseJsonBody(request, invitationCreateSchema);
    return withScope(async ({ invitationService }) => invitationService.create(session.userId, input));
  },
  { successStatus: 201 },
);

export const DELETE = apiHandler(async (request) => {
  requireRole(await requireSession(request), "operator");
  const { id } = parseIdQuery(request);
  await withScope(async ({ invitationService }) => invitationService.revoke(id));
  return { id };
});
