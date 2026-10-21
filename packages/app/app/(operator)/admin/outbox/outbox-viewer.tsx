"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { EmptyState } from "@devmentor/ui/backend/feedback/empty-state";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/data-table";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@devmentor/ui/components/ui/card";

/** Kształt `OutboxMessageDto` z `@devmentor/core` (kopia — strona kliencka nie importuje głównego `core`). */
export interface OutboxMessage {
  id: string;
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

const OUTBOX_PATH = "/api/mail/outbox";
/** Kod błędu z `NotFoundError` — trasa zwraca go, gdy skrzynka jest wyłączona (`MAIL_ADAPTER=noop`). */
const NOT_FOUND_CODE = "NOT_FOUND";
/**
 * Adres `http(s)://…` w treści wiadomości. Ostatni znak nie może być interpunkcją, żeby kropka
 * kończąca zdanie nie trafiła do linku. Grupa przechwytująca: `split` zostawia adresy na nieparzystych indeksach.
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)])/;

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Warsaw" });
const formatDate = (iso: string) => dateFormat.format(new Date(iso));

const COLUMNS: DataTableColumn<OutboxMessage>[] = [
  { id: "sentAt", header: "Data", cell: (row) => formatDate(row.sentAt), className: "text-muted-foreground" },
  { id: "to", header: "Adresat", cell: (row) => row.to },
  { id: "subject", header: "Temat", cell: (row) => row.subject },
];

export function OutboxViewer() {
  const [result, setResult] = useState<ApiResult<OutboxMessage[]> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setResult(null);
    setResult(await apiCall<OutboxMessage[]>(OUTBOX_PATH));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiCall<OutboxMessage[]>(OUTBOX_PATH, { signal: controller.signal }).then((loaded) => {
      if (!controller.signal.aborted) {
        setResult(loaded);
      }
    });
    return () => controller.abort();
  }, []);

  if (result && !result.ok && result.error.code === NOT_FOUND_CODE) {
    return (
      <EmptyState
        title="Skrzynka deweloperska jest wyłączona"
        description="Ten serwer nie zapisuje wiadomości (MAIL_ADAPTER=noop), więc nie ma czego pokazać. Podgląd działa tylko poza produkcją, z MAIL_ADAPTER=outbox."
      />
    );
  }

  const messages = result?.ok ? result.data : undefined;
  const expanded = messages?.find((message) => message.id === expandedId);

  return (
    <div className="flex flex-col gap-between-groups">
      <p className="rounded-md border bg-muted px-between-groups py-in-group text-body font-medium">
        Skrzynka deweloperska — wiadomości nie są wysyłane
      </p>
      <DataTable
        columns={COLUMNS}
        rows={messages}
        isLoading={result === null}
        error={result && !result.ok ? result.error.message : null}
        onRetry={reload}
        getRowId={(row) => row.id}
        emptyTitle="Brak wiadomości"
        emptyDescription="Skrzynka czyści się po restarcie serwera."
        rowActions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={row.id === expandedId}
            onClick={() => setExpandedId(row.id === expandedId ? null : row.id)}
          >
            {row.id === expandedId ? "Zwiń" : "Pokaż"}
          </Button>
        )}
      />
      {/* Luka DS12: DataTable nie rozwija wierszy — treść wybranej wiadomości w karcie pod tabelą. */}
      {expanded && (
        <Card>
          <CardHeader>
            <h2 className="text-section-title">{expanded.subject}</h2>
            <CardDescription>
              Do: {expanded.to} · {formatDate(expanded.sentAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap break-words text-body">
            <MessageText text={expanded.text} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Treść z klikalnymi adresami — bez `dangerouslySetInnerHTML`, tekst zostaje tekstem. */
function MessageText({ text }: { text: string }) {
  return text.split(URL_PATTERN).map((part, index) => (
    <Fragment key={index}>
      {index % 2 === 1 ? (
        <a href={part} className="break-all font-code text-primary underline-offset-4 hover:underline">
          {part}
        </a>
      ) : (
        part
      )}
    </Fragment>
  ));
}
