import type { MouseEvent, ReactNode } from "react";
import { getState, openRoute, resolveRoute, type Params } from "../sim/store";

/** Link produktu: `href` wskazuje ekran prototypu, kliknięcie przechodzi przez bramki tras (openRoute). */
export function RouteLink({
  to,
  params,
  className,
  children,
}: {
  to: string;
  params?: Params;
  className?: string;
  children: ReactNode;
}) {
  const target = resolveRoute(to, getState(), params);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openRoute(to, params);
  }
  return (
    <a href={`#${target.screen}`} onClick={handleClick} className={className ?? "text-primary underline-offset-4 hover:underline"}>
      {children}
    </a>
  );
}
