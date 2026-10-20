import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@devmentor/ui/components/ui/card";

// LUKA DS05: brak layoutu stron (auth) — wąska karta na środku z tokenów (szerokość: --measure-text,
// odstępy publiczne: --space-section-public).
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-between-groups bg-muted/40 px-between-groups py-section-public">
      <p className="text-section-title">DevMentor</p>
      <Card className="w-full max-w-measure">
        <CardHeader>
          {/* LUKA DS19: CardTitle renderuje <div>, a strona potrzebuje nagłówka h1 — h1 z tokenem typografii. */}
          <h1 className="text-page-title">{title}</h1>
          {description && <CardDescription className="text-body-public">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-between-groups">{children}</CardContent>
      </Card>
    </div>
  );
}
