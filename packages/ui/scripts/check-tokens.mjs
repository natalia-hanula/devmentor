#!/usr/bin/env node
// Szuka wartości spoza tokenów w design systemie i kończy się błędem (do CI):
//   - kolory (hex, rgb/rgba, hsl/hsla, oklch, oklab, lab, lch, color()) poza src/styles/tokens.css,
//   - klasy palety Tailwinda (bg-zinc-900, text-white, border-black/10 …),
//   - wartości arbitralne Tailwinda (p-[13px], ring-[3px], w-[100px] …).
// Użycie: node scripts/check-tokens.mjs [katalog …] — domyślnie src, stories i .storybook pakietu ui.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_FILE = path.join(root, "src/styles/tokens.css");
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".mdx", ".html"]);
const SKIP_DIRS = new Set(["node_modules", "storybook-static", "public"]);

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY = "bg|text|border(?:-[xytrbl])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow|inset-shadow";
const RULES = [
  { name: "colour value outside tokens.css", pattern: /(?<![\w&-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/g },
  { name: "Tailwind palette class", pattern: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:\\/\\d+)?(?![\\w-])`, "g") },
  // Wariant arbitralny (`data-[state=open]:`, `has-[>svg]:`) to selektor, nie wartość — dozwolony.
  { name: "Tailwind arbitrary value", pattern: /(?<![\w[])(?:[a-z][\w-]*(?:-\[[^\]\s]+\])?:)*-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[[^\]\s]+\](?!:)/g },
];

function* walk(entry) {
  const stat = statSync(entry);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(entry))) yield entry;
    return;
  }
  for (const name of readdirSync(entry)) {
    if (SKIP_DIRS.has(name)) continue;
    yield* walk(path.join(entry, name));
  }
}

const targets = process.argv.slice(2).length ? process.argv.slice(2).map((t) => path.resolve(t)) : ["src", "stories", ".storybook"].map((t) => path.join(root, t));
const findings = [];
for (const target of targets) {
  for (const file of walk(target)) {
    if (file === TOKENS_FILE) continue;
    let source = readFileSync(file, "utf8");
    // W MDX kod w `…` i w blokach ``` to przykłady w tekście dokumentacji (także „czego nie robić”), nie style strony.
    if (file.endsWith(".mdx")) source = source.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " ")).replace(/`[^`\n]*`/g, (code) => " ".repeat(code.length));
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      // Komentarze ze stroną dokumentacji nie są wartościami — pomijamy linie komentarzy.
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
      for (const rule of RULES) {
        for (const match of line.matchAll(rule.pattern)) {
          findings.push({ file: path.relative(process.cwd(), file), line: index + 1, rule: rule.name, value: match[0] });
        }
      }
    });
  }
}

for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule}: ${f.value}`);
if (findings.length) {
  console.error(`\n${findings.length} value(s) outside tokens. Use semantic tokens from src/styles/tokens.css (Foundations in Storybook).`);
  process.exit(1);
}
console.log("No values outside tokens.");
