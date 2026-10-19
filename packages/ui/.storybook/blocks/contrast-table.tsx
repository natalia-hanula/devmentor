import { useLayoutEffect, useRef, useState } from "react";
import { contrast, mix, readToken, toRgb, type Rgb } from "./color-math";
import { THEMES } from "./theme-frame";
import type { Theme } from "../theme";

export interface ContrastPair {
  /** Token tekstu lub elementu interfejsu, np. `--primary`. */
  foreground: string;
  /** Token tła. */
  background: string;
  /** text = 4,5 : 1 (WCAG 1.4.3), ui = 3 : 1 (WCAG 1.4.11), decoration = bez progu. */
  kind: "text" | "ui" | "decoration";
  /** Krycie warstwy tła nałożonej na `over`, np. hover `primary/90` na karcie. */
  backgroundAlpha?: number;
  over?: string;
  /** Krycie tekstu / elementu nałożonego na tło, np. pierścień `ring/50`. */
  foregroundAlpha?: number;
  usage: string;
}

const THRESHOLD = { text: 4.5, ui: 3, decoration: 0 } as const;

function measure(element: Element, pair: ContrastPair): number {
  const read = (token: string): Rgb => toRgb(readToken(element, token));
  const background = pair.backgroundAlpha && pair.over ? mix(read(pair.background), read(pair.over), pair.backgroundAlpha) : read(pair.background);
  const foreground = pair.foregroundAlpha ? mix(read(pair.foreground), background, pair.foregroundAlpha) : read(pair.foreground);
  return contrast(foreground, background);
}

function ResultCell({ theme, pair }: { theme: Theme; pair: ContrastPair }) {
  const ref = useRef<HTMLTableCellElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (ref.current) setRatio(measure(ref.current, pair));
  }, [pair]);
  const threshold = THRESHOLD[pair.kind];
  const passes = ratio !== null && ratio >= threshold;
  return (
    <td ref={ref} className={`${theme} py-list-row-y pr-in-group`}>
      {ratio === null ? "…" : (
        <span className="font-code text-code tabular-nums">
          {ratio.toFixed(2)} : 1 {threshold === 0 ? "— decoration" : passes ? "— pass" : "— FAIL"}
        </span>
      )}
    </td>
  );
}

/** Kontrast mierzony na żywo z tokenów w obu motywach. Wynik zawsze słowem, nie samym kolorem (WCAG 1.4.1). */
export function ContrastTable({ pairs }: { pairs: ContrastPair[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="text-meta text-muted-foreground">
          <tr className="border-b">
            <th className="py-list-row-y pr-in-group font-medium">Foreground / background</th>
            <th className="py-list-row-y pr-in-group font-medium">Threshold</th>
            <th className="py-list-row-y pr-in-group font-medium">Light</th>
            <th className="py-list-row-y pr-in-group font-medium">Dark</th>
            <th className="py-list-row-y font-medium">Where</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={`${pair.foreground}-${pair.foregroundAlpha ?? 1}-${pair.background}-${pair.backgroundAlpha ?? 1}-${pair.kind}`} className="border-b align-top">
              <td className="py-list-row-y pr-in-group">
                <code className="font-code text-code">
                  {pair.foreground}
                  {pair.foregroundAlpha ? `/${Math.round(pair.foregroundAlpha * 100)}` : ""} / {pair.background}
                  {pair.backgroundAlpha ? `/${Math.round(pair.backgroundAlpha * 100)} on ${pair.over}` : ""}
                </code>
              </td>
              <td className="py-list-row-y pr-in-group font-code text-code tabular-nums">
                {pair.kind === "decoration" ? "none" : `${THRESHOLD[pair.kind]} : 1`}
              </td>
              {THEMES.map((theme) => (
                <ResultCell key={theme} theme={theme} pair={pair} />
              ))}
              <td className="py-list-row-y">{pair.usage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
