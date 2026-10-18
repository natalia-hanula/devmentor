import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../src/components/ui/badge";
import { Button } from "../src/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../src/components/ui/card";
import { Input } from "../src/components/ui/input";
import { Label } from "../src/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { Textarea } from "../src/components/ui/textarea";
import { cn } from "../src/lib/utils";

describe("prymitywy shadcn/ui", () => {
  it("Button renderuje <button> albo — z asChild — przekazany element, z wariantami", () => {
    const { rerender } = render(<Button>Zapisz</Button>);
    expect(screen.getByRole("button", { name: "Zapisz" })).toHaveAttribute("data-slot", "button");

    rerender(
      <Button asChild variant="outline" size="sm">
        <a href="/x">Link</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute("href", "/x");
  });

  it("Badge renderuje <span> albo — z asChild — przekazany element", () => {
    const { rerender } = render(<Badge variant="destructive">Błąd</Badge>);
    expect(screen.getByText("Błąd")).toHaveAttribute("data-slot", "badge");

    rerender(
      <Badge asChild>
        <a href="/y">Etykieta</a>
      </Badge>,
    );
    expect(screen.getByRole("link", { name: "Etykieta" })).toBeInTheDocument();
  });

  it("Card składa się z nagłówka, akcji, treści i stopki", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tytuł</CardTitle>
          <CardDescription>Opis</CardDescription>
          <CardAction>Akcja</CardAction>
        </CardHeader>
        <CardContent>Treść</CardContent>
        <CardFooter>Stopka</CardFooter>
      </Card>,
    );

    for (const text of ["Tytuł", "Opis", "Akcja", "Treść", "Stopka"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("Input, Textarea i Label są powiązane i przyjmują atrybuty", () => {
    render(
      <>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" />
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" rows={3} />
      </>,
    );

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Bio")).toHaveAttribute("rows", "3");
  });

  it("Table renderuje pełną strukturę tabeli", () => {
    render(
      <Table>
        <TableCaption>Podpis</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Kolumna</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Komórka</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Suma</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByRole("table", { name: "Podpis" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Kolumna" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Suma" })).toBeInTheDocument();
  });

  it("cn łączy klasy i rozwiązuje konflikty Tailwind", () => {
    expect(cn("px-2", false, "px-4", { "text-sm": true })).toBe("px-4 text-sm");
  });
});
