import { Suspense } from "react";
import { NavLink } from "../_lib/nav-link";
import { SignedInHeader } from "../_lib/signed-in-header";
import { OutboxNavLink } from "./outbox-nav-link";

const NAV_ITEMS = [
  { href: "/admin/invitations", label: "Zaproszenia" },
  { href: "/admin", label: "Przegląd" },
  { href: "/admin/technologies", label: "Technologie" },
] as const;

/** Layout panelu admina: nagłówek zalogowanego (e01, L21) i nawigacja panelu operatora z aktywną pozycją. */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <SignedInHeader />
      <nav aria-label="Panel operatora" className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-between-groups px-6 py-in-group text-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
          <Suspense fallback={null}>
            <OutboxNavLink />
          </Suspense>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
