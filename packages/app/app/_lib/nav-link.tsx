"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const BASE_CLASS = "text-muted-foreground hover:text-foreground";
const ACTIVE_CLASS = "font-medium text-foreground underline underline-offset-4";

export interface NavLinkProps {
  href: string;
  children: ReactNode;
  /** Ścieżka, której podstrony też zaznaczają pozycję (np. `/admin` dla „Panelu operatora”); domyślnie tylko `href`. */
  activePrefix?: string;
}

/** Pozycja nawigacji z aktywnym stanem (`aria-current="page"`) wyliczanym z bieżącej ścieżki. */
export function NavLink({ href, children, activePrefix }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (activePrefix !== undefined && (pathname === activePrefix || pathname.startsWith(`${activePrefix}/`)));
  return (
    <Link href={href} aria-current={isActive ? "page" : undefined} className={isActive ? ACTIVE_CLASS : BASE_CLASS}>
      {children}
    </Link>
  );
}
