import { useLayoutEffect, useRef, useState } from "react";
import { readToken, toHex, toRgb } from "./color-math";
import { THEMES } from "./theme-frame";

export interface ColorRole {
  token: string;
  role: string;
  use: string;
  avoid: string;
  source: string;
}

function MeasuredSwatch({ token }: { token: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState("…");
  useLayoutEffect(() => {
    if (ref.current) setHex(toHex(toRgb(readToken(ref.current, token))));
  }, [token]);
  return (
    <span ref={ref} className="inline-flex items-center gap-in-group">
      <span className="size-6 shrink-0 rounded-sm border border-input" style={{ background: `var(${token})` }} aria-hidden="true" />
      <code className="font-code text-meta">{hex}</code>
    </span>
  );
}

/** Role kolorów z wartościami zmierzonymi w obu motywach (tabela w JSX — bez zależności od remark-gfm). */
export function ColorRoles({ roles }: { roles: ColorRole[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="text-meta text-muted-foreground">
          <tr className="border-b">
            <th className="py-list-row-y pr-in-group font-medium">Token</th>
            <th className="py-list-row-y pr-in-group font-medium">Light</th>
            <th className="py-list-row-y pr-in-group font-medium">Dark</th>
            <th className="py-list-row-y pr-in-group font-medium">Role</th>
            <th className="py-list-row-y pr-in-group font-medium">Use for</th>
            <th className="py-list-row-y pr-in-group font-medium">Do not use for</th>
            <th className="py-list-row-y font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.token} className="border-b align-top">
              <td className="py-list-row-y pr-in-group">
                <code className="font-code text-code">{role.token}</code>
              </td>
              {THEMES.map((theme) => (
                <td key={theme} className={`${theme} py-list-row-y pr-in-group`}>
                  <MeasuredSwatch token={role.token} />
                </td>
              ))}
              <td className="py-list-row-y pr-in-group">{role.role}</td>
              <td className="py-list-row-y pr-in-group">{role.use}</td>
              <td className="py-list-row-y pr-in-group">{role.avoid}</td>
              <td className="py-list-row-y text-meta text-muted-foreground">{role.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

