import type { ReactNode } from "react";

/** Adnotacja prototypu na ekranie (nie element produktu): co jest symulacją. Ramka przerywana jak w pasku przeglądu. */
export function SimNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-sm border border-dashed border-foreground px-in-group py-in-group text-meta">
      <span className="font-medium">Symulacja w prototypie: </span>
      {children}
    </p>
  );
}

/** Podpis elementu, który wchodzi dopiero w etapie B wdrożenia (L01). */
export function StageB() {
  return <span className="text-meta font-normal text-muted-foreground"> [etap B]</span>;
}
