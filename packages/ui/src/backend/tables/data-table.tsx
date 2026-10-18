"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState } from "../feedback/empty-state";
import { ErrorMessage } from "../feedback/error-message";
import { LoadingMessage } from "../feedback/loading-message";

/** Rozsądna długość strony dla list w panelu; nadpisywana przez `pageSize`. */
const DEFAULT_PAGE_SIZE = 10;

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** `undefined` = dane jeszcze się nie załadowały. */
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
  pageSize?: number;
}

/** Lista z konfiguracji kolumn: stany ładowania/błędu/pustki, paginacja i akcje wierszy. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  rowActions,
  pageSize = DEFAULT_PAGE_SIZE,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }
  if (isLoading || rows === undefined) {
    return <LoadingMessage />;
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const pageCount = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {rowActions && <TableHead className="text-right">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>
            Strona {currentPage + 1} z {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Poprzednia
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Następna
          </Button>
        </div>
      )}
    </div>
  );
}
