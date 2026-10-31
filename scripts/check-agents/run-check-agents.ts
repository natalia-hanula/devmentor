import type { CheckAgentsSystem } from "./system.ts";

const AGENTS_FILE = "AGENTS.md";

// Fragment w apostrofach grawisu, który jest wzorcem lub skrótem, a nie dosłowną ścieżką: spacje, `<nazwa>`,
// `*`, `{a,b}`, `…`, `YYYY`, URL-e i pakiety `@scope/…`.
const NOT_A_LITERAL_PATH = /[\s<>*…?={}()@:]|YYYY/;

// Ścieżki z AGENTS.md, które celowo nie istnieją w checkoutcie. Lista zamknięta — dopisuj tylko z uzasadnieniem.
const NOT_IN_CHECKOUT = [
  ".env", // sekrety, poza repozytorium
  "packages/app/.env", // symlink do `.env`, tworzony przez instalator
  "packages/shared", // przykład pakietu, którego jeszcze nie ma
];
const NOT_IN_CHECKOUT_PREFIXES = [
  "node_modules/", // instalowane przez `npm ci`
];

function isExempt(path: string): boolean {
  return NOT_IN_CHECKOUT.includes(path) || NOT_IN_CHECKOUT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Sprawdzamy tylko ścieżki zaczynające się od elementu istniejącego w katalogu głównym (`.ai/…`, `packages/…`,
// `eslint.config.mjs`). Skrócone zapisy względem pakietu (`core/src/logger.ts`, `api-handler.ts`) pomijamy.
export function findRepoPaths(markdown: string, rootEntries: readonly string[]): string[] {
  const roots = new Set(rootEntries);
  const paths = new Set<string>();
  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const candidate = match[1];
    if (NOT_A_LITERAL_PATH.test(candidate)) continue;
    if (!roots.has(candidate.split("/")[0])) continue;
    paths.add(candidate);
  }
  return [...paths];
}

export function runCheckAgents(system: CheckAgentsSystem, log: (line: string) => void): number {
  const paths = findRepoPaths(system.readFile(AGENTS_FILE), system.listRoot());
  const missing = paths.filter((path) => !isExempt(path) && !system.exists(path));
  if (missing.length === 0) {
    log(`${AGENTS_FILE}: wszystkie ${paths.length} wymienione ścieżki istnieją.`);
    return 0;
  }
  log(`${AGENTS_FILE} wymienia ścieżki, których nie ma w repozytorium:`);
  for (const path of missing) log(`  - ${path}`);
  return 1;
}
