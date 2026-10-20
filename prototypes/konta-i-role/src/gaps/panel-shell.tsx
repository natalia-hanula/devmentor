import type { ReactNode } from "react";
import { cn } from "cn";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Button } from "@devmentor/ui/components/ui/button";
import { hasRole, logout, sessionAccount, useSim } from "../sim/store";
import { RouteLink } from "./route-link";

// LUKA DS06: brak shellu panelu i nagłówka zalogowanego. e01 to propozycja (L21): nazwa, /account dla
// każdego, /mentor tylko dla mentora, /admin/invitations tylko dla operatora, „Wyloguj” (L04).
// LUKA DS20: klasa `max-w-panel` koliduje — Tailwind bierze `--spacing-panel` (24 px) zamiast `--container-panel`
// (72 rem), bo oba tokeny mają nazwę „panel”. Tu bezpośrednie odwołanie do tokenu `--layout-panel-max`.
// Ukrycie linku nie zastępuje bramek ról po stronie serwera (prototyp sprawdza je w resolveRoute).

const LINK = "text-muted-foreground hover:text-foreground";
const ACTIVE = "font-medium text-foreground underline underline-offset-4";

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <span aria-current={active ? "page" : undefined}>
      <RouteLink to={to} className={cn(LINK, active && ACTIVE)}>
        {children}
      </RouteLink>
    </span>
  );
}

/** Nawigacja panelu operatora z PP. „Technologie” i „Konfiguracja” są poza Epikiem 01. */
function OperatorNav({ active }: { active: string }) {
  const outOfScope = "cursor-not-allowed text-muted-foreground";
  return (
    <nav aria-label="Panel operatora" className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-(--layout-panel-max) flex-wrap items-center gap-between-groups px-panel py-in-group text-body">
        <NavLink to="/admin" active={active === "/admin"}>Przegląd</NavLink>
        <span className={outOfScope} aria-disabled="true">Technologie <span className="text-meta">(poza E01 — w prototypie nie działa)</span></span>
        <span className={outOfScope} aria-disabled="true">Konfiguracja <span className="text-meta">(poza E01 — w prototypie nie działa)</span></span>
        <NavLink to="/admin/outbox" active={active === "/admin/outbox"}>Skrzynka</NavLink>
        <NavLink to="/admin/invitations" active={active === "/admin/invitations"}>Zaproszenia</NavLink>
      </div>
    </nav>
  );
}

export function PanelShell({ active, children }: { active: string; children: ReactNode }) {
  const sim = useSim();
  const account = sessionAccount(sim);
  return (
    <div className="flex flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-(--layout-panel-max) flex-wrap items-center gap-between-groups px-panel py-in-group">
          <span className="font-semibold">DevMentor</span>
          <nav aria-label="Konto" className="flex flex-wrap gap-between-groups text-body">
            <NavLink to="/account" active={active === "/account"}>Konto</NavLink>
            {hasRole(account, "mentor") && <NavLink to="/mentor" active={active === "/mentor"}>Panel mentora</NavLink>}
            {hasRole(account, "operator") && (
              <NavLink to="/admin/invitations" active={active.startsWith("/admin")}>Panel operatora</NavLink>
            )}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-in-group">
            <span className="text-body">{account?.name}</span>
            <Badge variant="outline" title="Nagłówek zalogowanego to propozycja (L21) — przed implementacją potrzebne kryterium E01">
              e01: propozycja
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              Wyloguj
            </Button>
          </div>
        </div>
      </header>
      {hasRole(account, "operator") && active.startsWith("/admin") && <OperatorNav active={active} />}
      <main className="mx-auto flex w-full max-w-(--layout-panel-max) flex-col gap-between-groups px-panel py-section">{children}</main>
    </div>
  );
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-in-group">
      <h1 className="text-page-title">{title}</h1>
      {description && <p className="text-body text-muted-foreground">{description}</p>}
    </div>
  );
}
