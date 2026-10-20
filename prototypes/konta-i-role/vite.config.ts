import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Wynik budowania trafia do folderu, który Storybook serwuje jako statyczny (staticDirs).
// Folder jest w .gitignore — to kopia do podglądu, nie kod design systemu.
const outDir = fileURLToPath(new URL("../../packages/ui/.storybook/public/prototypes/konta-i-role", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [tailwindcss()],
  // Vite 8 kompiluje JSX wbudowanym Oxc — bez @vitejs/plugin-react (prototyp nie potrzebuje HMR).
  oxc: { jsx: { runtime: "automatic" } },
  build: { outDir, emptyOutDir: true },
});
