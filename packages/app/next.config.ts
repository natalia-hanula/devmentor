import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Reguły dla agentów trzymamy w głównym AGENTS.md — bez generowania packages/app/AGENTS.md.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  // MikroORM 7 (driver, warstwa SQL, migracje) nie jest na domyślnej liście Next.js
  // (jest tam tylko `@mikro-orm/core` i stary `@mikro-orm/knex`), więc ładujemy go natywnie z node_modules.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
