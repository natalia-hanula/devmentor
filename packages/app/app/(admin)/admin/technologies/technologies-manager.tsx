"use client";

import { useCallback, useEffect, useState } from "react";
import { technologyCreateSchema, type TechnologyCreateInput } from "@devmentor/core/validators/mentors/technology-create.schema";
import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/error-message";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms/crud-form";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/data-table";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";

interface Technology {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

const TECHNOLOGIES_PATH = "/api/technologies";

const COLUMNS: DataTableColumn<Technology>[] = [
  { id: "name", header: "Nazwa", cell: (row) => row.name },
  { id: "slug", header: "Slug", cell: (row) => <code className="text-xs">{row.slug}</code> },
  {
    id: "createdAt",
    header: "Dodano",
    cell: (row) => new Date(row.createdAt).toLocaleDateString("pl-PL"),
    className: "text-muted-foreground",
  },
];

const FORM_FIELDS: CrudFormField<TechnologyCreateInput>[] = [
  { name: "name", label: "Nazwa", placeholder: "np. TypeScript" },
  { name: "slug", label: "Slug", placeholder: "np. typescript", description: "Małe litery, cyfry i myślniki." },
];

export function TechnologiesManager() {
  const [result, setResult] = useState<ApiResult<Technology[]> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setResult(await apiCall<Technology[]>(TECHNOLOGIES_PATH));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<Technology[]>(TECHNOLOGIES_PATH, { signal: controller.signal }).then(setResult);
    return () => controller.abort();
  }, []);

  async function handleDelete(technology: Technology) {
    setActionError(null);
    const deletion = await apiCall(`${TECHNOLOGIES_PATH}?id=${encodeURIComponent(technology.id)}`, { method: "DELETE" });
    if (!deletion.ok) {
      setActionError(deletion.error.message);
      return;
    }
    await reload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        {actionError && <ErrorMessage title="Nie usunięto" message={actionError} />}
        <DataTable
          columns={COLUMNS}
          rows={result?.ok ? result.data : undefined}
          isLoading={result === null}
          error={result && !result.ok ? result.error.message : null}
          onRetry={reload}
          getRowId={(row) => row.id}
          emptyTitle="Brak technologii"
          emptyDescription="Dodaj pierwszą technologię formularzem obok."
          rowActions={(row) => (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
              Usuń
            </Button>
          )}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nowa technologia</CardTitle>
          <CardDescription>Zapis wymaga zalogowania — do czasu wdrożenia auth serwer odpowie 401.</CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm
            schema={technologyCreateSchema}
            fields={FORM_FIELDS}
            submitLabel="Dodaj"
            onSubmit={(values) => apiCall<Technology>(TECHNOLOGIES_PATH, { method: "POST", body: values })}
            onSuccess={reload}
          />
        </CardContent>
      </Card>
    </div>
  );
}
