import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { readToken } from "./color-math";

export interface TokenRow {
  token: string;
  /** Klasa Tailwinda, która korzysta z tokenu. */
  utility: string;
  use: string;
  source: string;
  /** Opcjonalny podgląd wartości (np. pasek odstępu). */
  preview?: ReactNode;
}

function MeasuredValue({ token }: { token: string }) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState("…");
  useLayoutEffect(() => {
    if (ref.current) setValue(readToken(ref.current, token) || "—");
  }, [token]);
  return (
    <code ref={ref} className="font-code text-code">
      {value}
    </code>
  );
}

/** Tabela tokenów z wartością odczytaną z CSS (nie przepisaną ręcznie). */
export function TokenTable({ rows }: { rows: TokenRow[] }) {
  const hasPreview = rows.some((row) => row.preview);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="text-meta text-muted-foreground">
          <tr className="border-b">
            <th className="py-list-row-y pr-in-group font-medium">Token</th>
            <th className="py-list-row-y pr-in-group font-medium">Value</th>
            <th className="py-list-row-y pr-in-group font-medium">Utility</th>
            {hasPreview && <th className="py-list-row-y pr-in-group font-medium">Preview</th>}
            <th className="py-list-row-y pr-in-group font-medium">Use for</th>
            <th className="py-list-row-y font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.token} className="border-b align-top">
              <td className="py-list-row-y pr-in-group">
                <code className="font-code text-code">{row.token}</code>
              </td>
              <td className="py-list-row-y pr-in-group">
                <MeasuredValue token={row.token} />
              </td>
              <td className="py-list-row-y pr-in-group">
                <code className="font-code text-code">{row.utility}</code>
              </td>
              {hasPreview && <td className="py-list-row-y pr-in-group">{row.preview}</td>}
              <td className="py-list-row-y pr-in-group">{row.use}</td>
              <td className="py-list-row-y text-meta text-muted-foreground">{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
