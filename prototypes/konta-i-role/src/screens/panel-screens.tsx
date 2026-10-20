/* Ekrany zalogowanych: s04, s09–s13 (nagłówek e01 w PanelShell). */
import { useState } from "react";
import { CrudForm } from "@devmentor/ui/backend/forms/crud-form";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/data-table";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Button, buttonVariants } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@devmentor/ui/components/ui/card";
import { Input } from "@devmentor/ui/components/ui/input";
import { Notice } from "../gaps/notice";
import { PageTitle, PanelShell } from "../gaps/panel-shell";
import { RouteLink } from "../gaps/route-link";
import { SimNote, StageB } from "../gaps/sim-note";
import type { Invitation, Mail, Role } from "../sim/data";
import { invitationSchema } from "../sim/schemas";
import {
  accountName,
  config,
  createInvitation,
  dismissCreatedInvitation,
  formatDate,
  homeRoute,
  invitationStatus,
  logout,
  mailLink,
  openMailLink,
  resendVerification,
  revokeInvitation,
  revokeMentorRole,
  sessionAccount,
  setView,
  useSim,
  type InvitationStatus,
} from "../sim/store";
import { PendingState } from "./pending-state";

const ROLE_LABELS: Record<Role, string> = { mentee: "mentee", mentor: "mentor", operator: "operator" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-list-row-gap">
      <dt className="text-meta text-muted-foreground">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}

function ResendButton({ screen, sending }: { screen: "s04" | "s09"; sending: boolean }) {
  return (
    <Button variant="outline" size="sm" onClick={() => void resendVerification(screen)} disabled={sending}>
      {sending ? "Wysyłanie…" : "Wyślij ponownie"}
    </Button>
  );
}

export function AccountScreen() {
  const sim = useSim();
  const view = sim.views.s04;
  const account = sessionAccount(sim);
  const loading = view.state === "s04.1";
  const resend = view.params.resend;
  return (
    <PanelShell active="/account">
      <PageTitle title="Konto" />
      {loading && <LoadingMessage label="Ładowanie konta…" />}
      {(view.state === "s04.3" || view.state === "s04.4") && account && !account.emailVerified && (
        <Notice
          tone="warning"
          title="Potwierdź adres e-mail — będzie potrzebny przed pierwszą rezerwacją"
          action={
            <>
              <ResendButton screen="s04" sending={resend === "sending"} />
              <Button variant="outline" size="sm" disabled>
                Zmień adres<StageB /> — w prototypie od etapu 2
              </Button>
            </>
          }
        >
          {resend === "sent" && `Wysłaliśmy nowy link na adres ${account.email}. (tekst: propozycja, L12)`}
        </Notice>
      )}
      {(view.state === "s04.5" || view.state === "s04.6" || view.state === "s04.7" || view.state === "s04.8") && (
        <PendingState stateId={view.state} />
      )}
      {!loading && account && (
        <Card className="max-w-measure">
          <CardContent>
            <dl className="flex flex-col gap-between-groups">
              <Field label="E-mail">{account.email}</Field>
              <Field label="Wyświetlana nazwa">{account.name}</Field>
              <Field label="Role">
                <span className="flex flex-wrap gap-in-group">
                  {account.roles.map((role) => (
                    <Badge key={role} variant="secondary">{ROLE_LABELS[role]}</Badge>
                  ))}
                </span>
              </Field>
              <Field label="Status e-maila">
                {/* LUKA DS10: brak wariantów Badge dla statusów (sukces/ostrzeżenie) — tekst niesie znaczenie. */}
                <Badge variant={account.emailVerified ? "default" : "outline"}>
                  {account.emailVerified ? "potwierdzony" : "niepotwierdzony"}
                </Badge>
              </Field>
            </dl>
          </CardContent>
        </Card>
      )}
      <div>
        <Button variant="outline" onClick={logout}>Wyloguj</Button>
      </div>
    </PanelShell>
  );
}

export function MentorScreen() {
  const sim = useSim();
  const view = sim.views.s09;
  const account = sessionAccount(sim);
  return (
    <PanelShell active="/mentor">
      <PageTitle title="Panel mentora" />
      {view.state === "s09.7" && <LoadingMessage label="Ładowanie panelu…" />}
      {view.params.notice === "already-mentor" && <Notice tone="success" title="Masz już rolę mentora" />}
      {view.state === "s09.2" && account && !account.emailVerified && (
        <Notice
          tone="warning"
          title="Potwierdź adres e-mail — bez tego nie opublikujesz profilu"
          action={<ResendButton screen="s09" sending={view.params.resend === "sending"} />}
        >
          {view.params.resend === "sent" && `Wysłaliśmy nowy link na adres ${account.email}. (tekst: propozycja, L12)`}
        </Notice>
      )}
      {(view.state === "s09.1" || view.state === "s09.2") && (
        <Card className="max-w-measure">
          <CardContent>
            <p className="text-body">Masz rolę mentora. Profil, cena i terminy pojawią się tu w kolejnym etapie.</p>
          </CardContent>
        </Card>
      )}
    </PanelShell>
  );
}

export function AdminOverviewScreen() {
  const sim = useSim();
  const view = sim.views.s10;
  const checking = view.params.checking === "1";
  function refresh() {
    setView("s10", { state: "s10.1", params: { ...view.params, checking: "1" } });
    setTimeout(() => setView("s10", { state: "s10.1", params: { ...view.params, checking: "" } }), config.latencyMs);
  }
  return (
    <PanelShell active="/admin">
      <PageTitle title="Panel admina" description="Stan usług aplikacji." />
      {view.state === "s10.4" && <PendingState stateId="s10.4" />}
      <Card className="max-w-measure">
        <CardHeader>
          <h2 className="text-section-title">Baza danych</h2>
          <CardDescription>PostgreSQL przez MikroORM</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-in-group">
          {checking ? <LoadingMessage label="Sprawdzanie połączenia…" /> : <Badge>Połączono · PostgreSQL</Badge>}
          <div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={checking}>Odśwież</Button>
          </div>
        </CardContent>
      </Card>
      <SimNote>istniejąca strona /admin z kartą stanu bazy; stan połączenia jest symulowany.</SimNote>
    </PanelShell>
  );
}

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Oczekuje",
  accepted: "Przyjęte",
  revoked: "Cofnięte",
  expired: "Wygasło",
};

// LUKA DS10: brak wariantów Badge dla statusów — istniejące warianty, rozróżnienie niesie tekst.
const STATUS_VARIANTS: Record<InvitationStatus, "default" | "secondary" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  revoked: "outline",
  expired: "outline",
};

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("ok");
    } catch {
      // Schowek bywa zablokowany (uprawnienia przeglądarki) — pokazujemy obejście zamiast błędu.
      setCopied("failed");
    }
  }
  // LUKA DS08: brak pola tylko do odczytu z „Kopiuj” — Input readOnly + Button.
  // LUKA DS09: brak toastu — potwierdzenie w regionie role="status".
  return (
    <div className="flex flex-col gap-in-group">
      <div className="flex flex-wrap gap-in-group">
        <Input readOnly value={value} aria-label="Link zaproszenia" className="min-w-0 flex-1 font-code" onFocus={(event) => event.target.select()} />
        <Button variant="outline" onClick={() => void copy()}>Kopiuj</Button>
      </div>
      <p role="status" className="text-meta text-muted-foreground">
        {copied === "ok" && "Skopiowano"}
        {copied === "failed" && "Nie udało się skopiować — zaznacz link i skopiuj ręcznie."}
      </p>
    </div>
  );
}

function RowActions({ invitation }: { invitation: Invitation }) {
  const sim = useSim();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = invitationStatus(invitation);
  const owner = sim.accounts.find((account) => account.id === invitation.acceptedBy);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    await action();
    setBusy(false);
    setConfirming(false);
  }
  if (status === "pending") {
    return (
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => revokeInvitation(invitation.id))}>
        {busy ? "Cofanie…" : "Cofnij"}
      </Button>
    );
  }
  if (status !== "accepted" || owner?.mentorRevoked) return null;
  if (!confirming) {
    return <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>Odbierz rolę mentora</Button>;
  }
  // LUKA DS07: brak AlertDialog — potwierdzenie w wierszu.
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-in-group">
      <span className="text-meta">Odebrać rolę mentora kontu {owner?.name}?</span>
      <Button variant="destructive" size="sm" disabled={busy} onClick={() => void run(() => revokeMentorRole(invitation.id))}>
        {busy ? "Odbieranie…" : "Odbierz rolę"}
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>Anuluj</Button>
    </span>
  );
}

export function InvitationsScreen() {
  const sim = useSim();
  const view = sim.views.s11;
  const loading = view.state === "s11.1";
  const created = sim.createdInvitation;
  const columns: DataTableColumn<Invitation>[] = [
    { id: "email", header: "E-mail", cell: (row) => row.email },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const status = invitationStatus(row);
        const revokedRole = status === "accepted" && sim.accounts.find((account) => account.id === row.acceptedBy)?.mentorRevoked;
        return (
          <span className="flex flex-col items-start gap-list-row-gap">
            <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
            {revokedRole && <span className="text-meta text-muted-foreground">rola mentora odebrana</span>}
          </span>
        );
      },
    },
    { id: "created", header: "Utworzone", cell: (row) => formatDate(row.createdAt) },
    { id: "expires", header: "Wygasa", cell: (row) => formatDate(row.expiresAt) },
    { id: "accepted", header: "Przyjęte przez", cell: (row) => (row.acceptedBy ? accountName(row.acceptedBy) : "—") },
  ];
  return (
    <PanelShell active="/admin/invitations">
      <div className="flex flex-wrap items-end justify-between gap-between-groups">
        <PageTitle title="Zaproszenia" />
        {view.state !== "s11.4" && !loading && (
          <Button onClick={() => setView("s11", { state: "s11.4", params: view.params })}>Zaproś mentora</Button>
        )}
      </div>
      {view.params.notice === "revoked" && view.state === "s11.9" && <Notice tone="success" title="Zaproszenie cofnięte (tekst: propozycja)" />}
      {view.params.notice === "role-revoked" && view.state === "s11.10" && (
        <Notice tone="success" title="Rola mentora odebrana (tekst: propozycja)" />
      )}
      {view.state === "s11.4" && (
        <Card className="max-w-measure">
          <CardHeader>
            <h2 className="text-section-title">Zaproś mentora</h2>
          </CardHeader>
          <CardContent>
            {/* LUKA DS01: pole e-mail w CrudForm renderuje się jako type="text" (CrudForm ma tylko text/textarea). */}
            <CrudForm
              key={`${sim.resetCount}-${view.nonce}`}
              schema={invitationSchema}
              fields={[{ name: "email", label: "E-mail" }]}
              onSubmit={(values) => createInvitation(values.email)}
              onCancel={() => setView("s11", { state: "s11.3", params: view.params })}
              submitLabel="Zaproś"
            />
          </CardContent>
        </Card>
      )}
      {view.state === "s11.5" && created && (
        <Card className="max-w-measure">
          <CardHeader>
            <h2 className="text-section-title">Zaproszenie dla {created.email}</h2>
            <CardDescription>Link widzisz tylko teraz.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-between-groups">
            <CopyField value={created.link} />
            <div>
              <Button variant="outline" onClick={dismissCreatedInvitation}>Zamknij</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {["s11.2", "s11.6", "s11.7", "s11.8", "s11.11", "s11.12"].includes(view.state) && <PendingState stateId={view.state} />}
      <DataTable
        columns={columns}
        rows={loading ? undefined : sim.invitations}
        isLoading={loading}
        getRowId={(row) => row.id}
        emptyTitle="Brak zaproszeń (tekst: propozycja)"
        rowActions={(row) => <RowActions invitation={row} />}
      />
    </PanelShell>
  );
}

const MAIL_BODIES: Record<Mail["kind"], string> = {
  invite: "Masz zaproszenie do roli mentora w DevMentor. Link jest ważny 14 dni:",
  verify: "Potwierdź adres e-mail, otwierając link:",
  reset: "Ustaw nowe hasło, otwierając link:",
};

export function OutboxScreen() {
  const sim = useSim();
  const view = sim.views.s12;
  const loading = view.state === "s12.4";
  const expanded = sim.outbox.find((mail) => mail.id === view.params.expanded);
  function toggle(mail: Mail) {
    const open = view.params.expanded === mail.id;
    setView("s12", { state: open ? "s12.1" : "s12.3", params: { ...view.params, expanded: open ? "" : mail.id } });
  }
  const columns: DataTableColumn<Mail>[] = [
    { id: "date", header: "Data", cell: (row) => formatDate(row.sentAt) },
    { id: "to", header: "Adresat", cell: (row) => row.to },
    { id: "subject", header: "Temat", cell: (row) => <>{row.subject}{row.stageB && <StageB />}</> },
  ];
  return (
    <PanelShell active="/admin/outbox">
      <PageTitle title="Skrzynka" />
      <Notice title="Skrzynka deweloperska — wiadomości nie są wysyłane" />
      {(view.state === "s12.2" || view.state === "s12.5" || view.state === "s12.6") && <PendingState stateId={view.state} />}
      <DataTable
        columns={columns}
        rows={loading ? undefined : sim.outbox}
        isLoading={loading}
        getRowId={(row) => row.id}
        emptyTitle="Brak wiadomości (tekst: propozycja)"
        rowActions={(row) => (
          <Button variant="ghost" size="sm" aria-expanded={view.params.expanded === row.id} onClick={() => toggle(row)}>
            {view.params.expanded === row.id ? "Zwiń" : "Pokaż"}
          </Button>
        )}
      />
      {expanded && (
        // LUKA DS12: DataTable nie umie rozwijać wiersza — treść wiadomości w karcie pod tabelą.
        <Card>
          <CardHeader>
            <h2 className="text-section-title">{expanded.subject}</h2>
            <CardDescription>
              Do: {expanded.to} · {formatDate(expanded.sentAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-in-group text-body">
            <p>{MAIL_BODIES[expanded.kind]} <span className="text-meta text-muted-foreground">(treść: propozycja)</span></p>
            <a
              href={expanded.kind === "invite" ? "#s08" : expanded.kind === "verify" ? "#s05" : "#s07"}
              onClick={(event) => {
                event.preventDefault();
                openMailLink(expanded);
              }}
              className="break-all font-code text-primary underline-offset-4 hover:underline"
            >
              {mailLink(expanded)}
            </a>
          </CardContent>
        </Card>
      )}
    </PanelShell>
  );
}

const REQUIRED_ROLE_LABELS: Record<string, string> = { mentor: "mentor", operator: "operator" };

export function ForbiddenScreen() {
  const sim = useSim();
  const view = sim.views.s13;
  const account = sessionAccount(sim);
  const role = REQUIRED_ROLE_LABELS[view.params.requiredRole ?? "mentor"];
  // LUKA DS11: ErrorMessage nie ma wariantu „brak dostępu” (tytuł, zdanie z rolą, akcje bez „Ponów”) — z tokenów.
  return (
    <PanelShell active={view.params.pathname ?? ""}>
      <div className="flex max-w-measure flex-col gap-between-groups rounded-md border border-destructive/40 bg-destructive/5 p-panel">
        <h1 className="text-page-title">Nie masz dostępu do tej strony</h1>
        <p className="text-body">Ta strona wymaga roli {role}.</p>
        {view.state === "s13.2" && view.params.pathname === "/invite" && (
          <p className="text-body">Zaproszenia przyjmuje konto mentora, nie operatora.</p>
        )}
        <div className="flex flex-wrap items-center gap-between-groups">
          {account && (
            <RouteLink to={homeRoute(account)} className={buttonVariants()}>
              Wróć do swojej strony startowej
            </RouteLink>
          )}
          <a
            href="#s02"
            onClick={(event) => {
              event.preventDefault();
              logout();
            }}
            className="text-body text-primary underline-offset-4 hover:underline"
          >
            Zaloguj się innym kontem
          </a>
        </div>
      </div>
    </PanelShell>
  );
}
