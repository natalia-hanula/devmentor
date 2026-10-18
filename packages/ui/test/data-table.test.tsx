import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "../src/backend/tables/data-table";

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Nazwa", cell: (row) => row.name, className: "font-medium" },
];
const rows = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({ id: `r${i + 1}`, name: `Wiersz ${i + 1}` }));

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(<DataTable columns={columns} rows={rows(3)} getRowId={(row) => row.id} emptyTitle="Pusto" {...props} />);
}

describe("DataTable", () => {
  it("pokazuje ładowanie, gdy dane jeszcze nie przyszły lub isLoading", () => {
    const { rerender } = renderTable({ rows: undefined });
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<DataTable columns={columns} rows={rows(1)} isLoading getRowId={(r) => r.id} emptyTitle="Pusto" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("pokazuje błąd z możliwością ponowienia", async () => {
    const onRetry = vi.fn();
    renderTable({ error: "Serwer nie odpowiada", onRetry });

    await userEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Serwer nie odpowiada");
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("pokazuje pusty stan z opisem", () => {
    renderTable({ rows: [], emptyDescription: "Dodaj pierwszy wiersz" });

    expect(screen.getByText("Pusto")).toBeInTheDocument();
    expect(screen.getByText("Dodaj pierwszy wiersz")).toBeInTheDocument();
  });

  it("renderuje kolumny i akcje wierszy, bez paginacji dla jednej strony", async () => {
    const onDelete = vi.fn();
    renderTable({ rowActions: (row) => <button onClick={() => onDelete(row.id)}>Usuń</button> });

    expect(screen.getByRole("columnheader", { name: "Nazwa" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Akcje" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    await userEvent.click(within(screen.getAllByRole("row")[2]).getByRole("button", { name: "Usuń" }));
    expect(onDelete).toHaveBeenCalledWith("r2");
    expect(screen.queryByText(/Strona/)).not.toBeInTheDocument();
  });

  it("dzieli wiersze na strony i przełącza je przyciskami", async () => {
    renderTable({ rows: rows(5), pageSize: 2 });

    expect(screen.getByText("Strona 1 z 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poprzednia" })).toBeDisabled();
    expect(screen.queryByRole("columnheader", { name: "Akcje" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Następna" }));
    await userEvent.click(screen.getByRole("button", { name: "Następna" }));
    expect(screen.getByText("Strona 3 z 3")).toBeInTheDocument();
    expect(screen.getByText("Wiersz 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Następna" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Poprzednia" }));
    expect(screen.getByText("Strona 2 z 3")).toBeInTheDocument();
  });

  it("nie wychodzi poza ostatnią stronę, gdy liczba wierszy zmaleje", async () => {
    const { rerender } = renderTable({ rows: rows(5), pageSize: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Następna" }));
    await userEvent.click(screen.getByRole("button", { name: "Następna" }));

    rerender(<DataTable columns={columns} rows={rows(3)} pageSize={2} getRowId={(r) => r.id} emptyTitle="Pusto" />);

    expect(screen.getByText("Strona 2 z 2")).toBeInTheDocument();
  });

  it("domyślnie pokazuje 10 wierszy na stronę", () => {
    renderTable({ rows: rows(11) });

    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("Strona 1 z 2")).toBeInTheDocument();
  });
});
