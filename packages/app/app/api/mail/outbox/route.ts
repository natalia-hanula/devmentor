import { apiHandler, listOutboxMessages, requireRole, requireSession, withScope } from "@devmentor/core";

// Kolejność: sesja (401) → rola operatora (403) → skrzynka (404 przy `noop`), żeby nie-operator
// nie dowiedział się, czy skrzynka w ogóle działa. Treść wiadomości (tokeny) nie trafia do logów:
// `apiHandler` loguje tylko błąd i `METODA ścieżka`.
export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  requireRole(session, "operator");
  return withScope(async ({ mailOutbox }) => listOutboxMessages(mailOutbox));
});
