export type Theme = "light" | "dark";

/**
 * Motyw ustawiany na <html> (klasa `dark` + `data-theme`), żeby dialogi, menu i popovery
 * renderowane przez portale Radix poza story też go dostały (prompt, zasada 9).
 */
export function applyTheme(theme: unknown): void {
  const value: Theme = theme === "dark" ? "dark" : "light";
  const root = document.documentElement;
  root.classList.toggle("dark", value === "dark");
  root.dataset.theme = value;
  // Interfejs produktu jest po polsku (Q1) — czytnik ekranu ma czytać przykłady po polsku.
  root.lang = "pl";
}
