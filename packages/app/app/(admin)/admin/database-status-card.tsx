"use client";

import { useCallback, useEffect, useState } from "react";
import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";

interface DatabaseHealth {
  ok: boolean;
  serverVersion?: string;
}

export function DatabaseStatusCard() {
  const [result, setResult] = useState<ApiResult<DatabaseHealth> | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setResult(null);
    setResult(await apiCall<DatabaseHealth>("/api/health", { signal }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<DatabaseHealth>("/api/health", { signal: controller.signal }).then(setResult);
    return () => controller.abort();
  }, []);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Baza danych</CardTitle>
        <CardDescription>PostgreSQL przez MikroORM</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DatabaseStatus result={result} onRetry={() => refresh()} />
        <div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={result === null}>
            Odśwież
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseStatus({ result, onRetry }: { result: ApiResult<DatabaseHealth> | null; onRetry: () => void }) {
  if (result === null) {
    return <LoadingMessage label="Sprawdzanie połączenia…" />;
  }
  if (!result.ok) {
    return <ErrorMessage message={result.error.message} onRetry={onRetry} />;
  }
  if (!result.data.ok) {
    return <Badge variant="destructive">Brak połączenia</Badge>;
  }
  return <Badge>Połączono · PostgreSQL {result.data.serverVersion}</Badge>;
}
