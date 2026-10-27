import { Card, CardContent, CardHeader } from "@devmentor/ui/components/ui/card";
import type { ReactNode } from "react";

export interface AuthCardProps {
  title: string;
  children: ReactNode;
}

/** Wąska karta strony kont (luka DS05). `CardTitle` to `<div>`, a strona potrzebuje `<h1>` (jak w prototypie). */
export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-measure">
      <CardHeader>
        <h1 className="text-page-title">{title}</h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-between-groups">{children}</CardContent>
    </Card>
  );
}
