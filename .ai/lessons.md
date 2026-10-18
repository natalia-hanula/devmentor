# Lessons

Indeks ustaleń, wniosków i usprawnień zebranych podczas pracy nad projektem.
Przeczytaj ten plik przed rozpoczęciem pracy. Zasady dopisywania wpisów: zob. `AGENTS.md` → „Lessons”.

Format wpisu (najnowsze na górze):

```
- YYYY-MM-DD — <jedno zdanie: czego się nauczyliśmy / co robić inaczej> [→ lessons/YYYY-MM-DD-slug.md]
```

## Wpisy

- 2026-10-18 — Next.js czyta `.env` tylko z katalogu aplikacji; w monorepo `packages/app/.env` to symlink do głównego `.env` — `loadEnvConfig()` w `next.config.ts` NIE działa (zmienne giną przy renderowaniu). [→ lessons/2026-10-18-env-w-monorepo-next.md]
- 2026-10-18 — MikroORM 7 zastąpił `@mikro-orm/knex` pakietem `@mikro-orm/sql`; domyślna lista `serverExternalPackages` w Next 16.4 tego nie uwzględnia, więc `@mikro-orm/postgresql`, `sql` i `migrations` dopisujemy ręcznie. Nigdy nie dodawaj ich do `transpilePackages` (Next rzuci błąd). Turbopack sam transpiluje pakiety workspace.
- 2026-10-18 — shadcn CLI 4.x importuje `cn` z paczki npm `cn` (shadcn-ui/cn) i sam ją instaluje — to oficjalna zmiana, nie błąd; nie przywracaj `clsx`/`tailwind-merge`.
- 2026-10-18 — Decyzja człowieka: alerty `npm audit` o `braces` (przez `fast-glob` w `eslint-config-next` i `awilix`) akceptujemy — NIE cofaj Awilix do 6.x ani nie rób `npm audit fix --force`.
- 2026-10-18 — `next dev` sam pisze `AGENTS.md` w katalogu aplikacji; w `next.config.ts` mamy `agentRules: false` i bez `experimental.agentFeedback` (decyzja człowieka) — reguły dla agentów są tylko w głównym `AGENTS.md`, nie włączaj tych opcji z powrotem.
- 2026-10-18 — Zatrzymując serwer Next, zabijaj proces po porcie (`lsof -ti :3000 | xargs kill`), nie `pkill -f "next start"` (proces to `next-server`) — inaczej testujesz starą instancję.
