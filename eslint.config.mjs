import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Granice pakietów (zob. AGENTS.md → „Reguły zależności”): app → core → db, app → ui; ui samodzielne.
const crossPackageSourceImports = {
  group: ["**/app/src/**", "**/core/src/**", "**/db/src/**", "**/ui/src/**"],
  message: "Importuj inne pakiety przez nazwę (@devmentor/<pakiet>), nie ścieżką do ich źródeł.",
};
const mikroOrmOnlyInDb = {
  group: ["@mikro-orm/*"],
  message: "Tylko @devmentor/db importuje @mikro-orm/*. Użyj re-eksportów z @devmentor/db.",
};
const frameworkImports = {
  group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
  message: "Ten pakiet nie zależy od Next.js ani Reacta.",
};

function restrictImports(...patterns) {
  return { "no-restricted-imports": ["error", { patterns: [crossPackageSourceImports, ...patterns] }] };
}

const rawFetchMessage = "Wywołuj API przez apiCall/apiCallOrThrow z @devmentor/ui/backend/api/api-call.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    files: ["packages/app/**/*.{ts,tsx}"],
    rules: restrictImports(mikroOrmOnlyInDb, {
      group: ["@devmentor/db", "@devmentor/db/*"],
      message: "app sięga do danych przez serwisy z @devmentor/core (withScope), nie przez @devmentor/db.",
    }),
  },
  {
    files: ["packages/core/**/*.ts"],
    rules: restrictImports(mikroOrmOnlyInDb, frameworkImports, {
      group: ["@devmentor/app", "@devmentor/app/*", "@devmentor/ui", "@devmentor/ui/*"],
      message: "core zależy wyłącznie od @devmentor/db.",
    }),
  },
  {
    files: ["packages/db/**/*.ts"],
    rules: restrictImports(frameworkImports, {
      group: ["@devmentor/app", "@devmentor/app/*", "@devmentor/core", "@devmentor/core/*", "@devmentor/ui", "@devmentor/ui/*"],
      message: "db nie zależy od innych pakietów wewnętrznych.",
    }),
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: restrictImports(mikroOrmOnlyInDb, {
      group: ["@devmentor/app", "@devmentor/app/*", "@devmentor/core", "@devmentor/core/*", "@devmentor/db", "@devmentor/db/*"],
      message: "ui nie importuje pakietów wewnętrznych — kształty (np. koperta API) deklaruje lokalnie.",
    }),
  },
  {
    files: ["packages/app/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["packages/ui/src/backend/api/api-call.ts"],
    rules: {
      "no-restricted-globals": ["error", { name: "fetch", message: rawFetchMessage }],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "fetch", message: rawFetchMessage },
        { object: "globalThis", property: "fetch", message: rawFetchMessage },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Raport pokrycia generowany przez `npm test`.
    "coverage/**",
    // Zbudowany Storybook (`npm run build-storybook`).
    "**/storybook-static/**",
    // Kopie prototypów i materiały lekcji — nie kod produktu.
    "packages/ui/.storybook/public/prototypes/**",
    "lekcja-07/**",
    "prototypes/**",
  ]),
]);

export default eslintConfig;
