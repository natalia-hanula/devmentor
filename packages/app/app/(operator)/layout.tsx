import Link from "next/link";
import { Suspense } from "react";
import { OutboxNavLink } from "./outbox-nav-link";

const NAV_ITEMS = [
  { href: "/admin/invitations", label: "Zaproszenia" },
  { href: "/admin", label: "Przegląd" },
  { href: "/admin/technologies", label: "Technologie" },
] as const;

const NAV_LINK_CLASS = "hover:text-foreground";

/** Layout panelu admina — komponenty z `@devmentor/ui`. */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-6">
          <Link href="/" className="font-semibold">
            DevMentor
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK_CLASS}>
                {item.label}
              </Link>
            ))}
            <Suspense fallback={null}>
              <OutboxNavLink className={NAV_LINK_CLASS} />
            </Suspense>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
