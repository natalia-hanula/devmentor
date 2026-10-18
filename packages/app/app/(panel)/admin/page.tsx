import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@devmentor/ui/components/badge";
import { Button } from "@devmentor/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devmentor/ui/components/card";
import { createRequestScope } from "@/lib/container";

export const metadata: Metadata = {
  title: "Panel admina — DevMentor",
};

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel admina</h1>
        <p className="text-sm text-muted-foreground">Stan usług aplikacji.</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Baza danych</CardTitle>
          <CardDescription>PostgreSQL przez MikroORM</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <Suspense fallback={<Badge variant="outline">Sprawdzanie…</Badge>}>
            <DatabaseStatus />
          </Suspense>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin">Odśwież</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

async function DatabaseStatus() {
  // Stan bazy zawsze czytamy w czasie żądania, nie podczas prerenderu.
  await connection();
  const scope = await createRequestScope().catch((error: unknown) => {
    console.error("[admin] Nie udało się utworzyć scope DI:", error);
    return null;
  });
  const health = scope
    ? await scope.cradle.databaseHealthService.check()
    : { ok: false, error: "Nie udało się połączyć z bazą" };

  if (!health.ok) {
    console.error("[admin] Baza danych niedostępna:", health.error);
  }

  return health.ok ? (
    <Badge>Połączono · PostgreSQL {health.serverVersion}</Badge>
  ) : (
    <Badge variant="destructive">Brak połączenia</Badge>
  );
}
