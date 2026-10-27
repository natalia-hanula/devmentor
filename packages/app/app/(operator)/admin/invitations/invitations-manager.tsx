"use client";

import { useCallback, useEffect, useState } from "react";
import {
  invitationCreateSchema,
  type InvitationCreateInput,
} from "@devmentor/core/validators/auth/invitation-create.schema";
import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms/crud-form";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/data-table";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";
import { useSessionExpiredRedirect } from "../../../_lib/use-session-expired-redirect";

type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Kształt `InvitationDto` z `@devmentor/core` (kopia — strona kliencka nie importuje głównego `core`). */
interface Invitation {
  id: string;
  email: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: { id: string; displayName: string; email: string; mentorRoleRemoved: boolean };
}

/** Kształt `CreatedInvitationDto` — `link` z tokenem istnieje tylko w tej odpowiedzi. */
interface CreatedInvitation {
  invitation: Invitation;
  link: string;
  revokedPrevious: boolean;
  mailFailed: boolean;
}

const INVITATIONS_PATH = "/api/auth/invitations";
/** Kod `ConflictError` z `@devmentor/core` — wyścig przy tworzeniu zaproszenia (kopia, jak wyżej). */
const CONFLICT_CODE = "CONFLICT";

/** Statusy po polsku (L12). */
const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Oczekuje",
  accepted: "Przyjęte",
  revoked: "Cofnięte",
  expired: "Wygasło",
};

const STATUS_VARIANTS: Record<InvitationStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  accepted: "default",
  revoked: "secondary",
  expired: "secondary",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL");

const COLUMNS: DataTableColumn<Invitation>[] = [
  { id: "email", header: "E-mail", cell: (row) => row.email },
  { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
  { id: "createdAt", header: "Utworzone", cell: (row) => formatDate(row.createdAt), className: "text-muted-foreground" },
  { id: "expiresAt", header: "Wygasa", cell: (row) => formatDate(row.expiresAt), className: "text-muted-foreground" },
  {
    id: "acceptedBy",
    header: "Przyjęte przez",
    cell: (row) =>
      row.acceptedBy ? (
        <span className="flex flex-col">
          <span>
            {row.acceptedBy.displayName} ({row.acceptedBy.email})
          </span>
          {row.acceptedBy.mentorRoleRemoved && <span className="text-xs text-muted-foreground">rola mentora odebrana</span>}
        </span>
      ) : (
        "—"
      ),
  },
];

const FORM_FIELDS: CrudFormField<InvitationCreateInput>[] = [
  { name: "email", label: "E-mail zapraszanej osoby", type: "email", autoComplete: "off", placeholder: "np. ola@example.com" },
];

/** Lista zaproszeń z tworzeniem (jednorazowy panel z linkiem) i cofaniem oczekujących. */
export function InvitationsManager() {
  const [result, setResult] = useState<ApiResult<Invitation[]> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const redirectIfUnauthorized = useSessionExpiredRedirect();

  const show = useCallback(
    (loaded: ApiResult<Invitation[]>) => {
      if (!redirectIfUnauthorized(loaded)) {
        setResult(loaded);
      }
    },
    [redirectIfUnauthorized],
  );

  const reload = useCallback(async () => {
    show(await apiCall<Invitation[]>(INVITATIONS_PATH));
  }, [show]);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<Invitation[]>(INVITATIONS_PATH, { signal: controller.signal }).then((loaded) => {
      if (!controller.signal.aborted) {
        show(loaded);
      }
    });
    return () => controller.abort();
  }, [show]);

  async function handleCreate(values: InvitationCreateInput) {
    setActionError(null);
    const response = await apiCall<CreatedInvitation>(INVITATIONS_PATH, { method: "POST", body: values });
    redirectIfUnauthorized(response);
    if (response.ok) {
      setCreated(response.data);
    } else if (response.error.code === CONFLICT_CODE) {
      // Komunikat każe odświeżyć listę — robimy to za operatora.
      await reload();
    }
    return response;
  }

  async function handleRevoke(invitation: Invitation) {
    setActionError(null);
    const revocation = await apiCall(`${INVITATIONS_PATH}?id=${encodeURIComponent(invitation.id)}`, { method: "DELETE" });
    if (redirectIfUnauthorized(revocation)) {
      return;
    }
    if (!revocation.ok) {
      setActionError(revocation.error.message);
    }
    await reload();
  }

  return (
    <div className="flex flex-col gap-between-groups">
      {created && <CreatedInvitationPanel created={created} onClose={() => setCreated(null)} />}
      {actionError && <ErrorMessage title="Nie cofnięto zaproszenia" message={actionError} />}
      {isFormOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Zaproś mentora</CardTitle>
            <CardDescription>
              Zaproszenie jest ważne 14 dni. Nowe zaproszenie na ten sam adres cofa poprzednie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrudForm
              schema={invitationCreateSchema}
              fields={FORM_FIELDS}
              submitLabel="Utwórz zaproszenie"
              onSubmit={handleCreate}
              onSuccess={() => {
                setIsFormOpen(false);
                void reload();
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <Button onClick={() => setIsFormOpen(true)}>Zaproś mentora</Button>
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        rows={result?.ok ? result.data : undefined}
        isLoading={result === null}
        error={result && !result.ok ? result.error.message : null}
        onRetry={reload}
        getRowId={(row) => row.id}
        emptyTitle="Brak zaproszeń"
        emptyDescription="Zaproś pierwszego mentora przyciskiem powyżej."
        rowActions={(row) =>
          row.status === "pending" && (
            <Button variant="ghost" size="sm" onClick={() => handleRevoke(row)}>
              Cofnij
            </Button>
          )
        }
      />
    </div>
  );
}

/**
 * Jednorazowy panel z linkiem (L20): link z tokenem wraca z API tylko przy tworzeniu, więc po zamknięciu
 * panelu nie da się go odzyskać — trzeba utworzyć nowe zaproszenie.
 */
function CreatedInvitationPanel({ created, onClose }: { created: CreatedInvitation; onClose: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.link);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <Card role="region" aria-label="Utworzone zaproszenie">
      <CardHeader>
        <CardTitle>Zaproszenie dla {created.invitation.email}</CardTitle>
        <CardDescription>Link widzisz tylko teraz.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-in-group">
        {created.revokedPrevious && (
          <p role="status" className="text-body">
            Poprzednie zaproszenie dla tego adresu zostało cofnięte
          </p>
        )}
        {created.mailFailed && (
          <ErrorMessage title="Nie wysłano e-maila" message="Przekaż link zaproszonej osobie samodzielnie." />
        )}
        <code className="break-all rounded-md border bg-muted px-in-group py-in-group text-xs">{created.link}</code>
        <div className="flex items-center gap-in-group">
          <Button variant="outline" size="sm" onClick={copy}>
            {copyState === "copied" ? "Skopiowano" : "Kopiuj"}
          </Button>
          {copyState === "failed" && (
            <span role="status" className="text-sm text-muted-foreground">
              Nie udało się skopiować — zaznacz link ręcznie.
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
