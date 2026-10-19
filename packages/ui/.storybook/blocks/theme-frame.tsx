import type { ReactNode } from "react";
import type { Theme } from "../theme";

export const THEMES: Theme[] = ["light", "dark"];

/** Ramka z wymuszonym motywem — klasa `light` / `dark` redefiniuje tokeny dla zawartości. */
export function ThemeFrame({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <section className={`${theme} rounded-lg border bg-background p-panel text-foreground`} aria-label={theme === "dark" ? "Dark theme" : "Light theme"}>
      <p className="mb-in-group text-meta text-muted-foreground">{theme === "dark" ? "Dark theme" : "Light theme"}</p>
      {children}
    </section>
  );
}

/** Ta sama zawartość w obu motywach obok siebie. */
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-between-groups md:grid-cols-2">
      {THEMES.map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          {children}
        </ThemeFrame>
      ))}
    </div>
  );
}
