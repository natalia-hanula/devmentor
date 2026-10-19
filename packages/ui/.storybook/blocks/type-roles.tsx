import { useLayoutEffect, useRef, useState } from "react";

export interface TypeRole {
  role: string;
  className: string;
  sample: string;
  use: string;
  source: string;
}

function Specimen({ role }: { role: TypeRole }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [metrics, setMetrics] = useState("…");
  useLayoutEffect(() => {
    if (!ref.current) return;
    const style = getComputedStyle(ref.current);
    setMetrics(`${style.fontSize} / ${style.lineHeight} · ${style.fontWeight} · ${style.fontFamily.split(",")[0]}`);
  }, []);
  return (
    <>
      <p ref={ref} className={role.className}>
        {role.sample}
      </p>
      <p className="mt-in-group font-code text-meta text-muted-foreground">{metrics}</p>
    </>
  );
}

/** Role typograficzne z próbką treści produktu i zmierzonymi wartościami. */
export function TypeRoles({ roles }: { roles: TypeRole[] }) {
  return (
    <div className="divide-y border-y">
      {roles.map((role) => (
        <div key={role.role} className="grid gap-in-group py-between-groups md:grid-cols-3">
          <div className="md:col-span-2">
            <Specimen role={role} />
          </div>
          <div className="text-body">
            <p className="font-medium">{role.role}</p>
            <p>
              <code className="font-code text-code">{role.className}</code>
            </p>
            <p className="text-muted-foreground">{role.use}</p>
            <p className="text-meta text-muted-foreground">Source: {role.source}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
