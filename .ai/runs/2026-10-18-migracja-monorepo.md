# Migracja do monorepo

- **Spec:** `.ai/specs/2026-10-18-monorepo-architektura.md`
- **Start:** 2026-10-18
- **Tryb:** fazy z podsumowaniem po każdej; problemy z bazą nie blokują migracji.

## Plan

0. Log + aktualizacja specyfikacji o decyzje człowieka.
1. PostgreSQL 17 z Homebrew jako usługa, baza `devmentor` (+ `devmentor_test`), `.env.example`, `docker-compose.yml`.
2. npm workspaces, `tsconfig.base.json`, przeniesienie aplikacji do `packages/app` (`git mv`), weryfikacja dev/build.
3. Szkielety `core` (Awilix), `db` (MikroORM + migracje), `ui` (shadcn).
4. Integracja w `app`: kontener + scope na żądanie, przykładowa strona `(panel)` z komponentem `ui` i danymi z serwisu.
5. Vitest, pełna weryfikacja (lint, tsc, build, test, migracja, dev), aktualizacja README/AGENTS.md, przeniesienie specyfikacji.

## Przebieg

### Faza 0
- Spec zaktualizowana: status, decyzje 1–6, Vitest i `(panel)` w zakresie, kryterium `npm test`.

### Faza 1 — PostgreSQL
- `brew install postgresql@17` (17.11), `brew services start postgresql@17` — działa na `localhost:5432`.
- Rola `devmentor` (hasło `devmentor`, CREATEDB) + bazy `devmentor` i `devmentor_test`. Dane takie same jak w `docker-compose.yml`, żeby jeden `.env` pasował do obu wariantów.
- `docker-compose.yml` (postgres:17, healthcheck, wolumen) + `docker/postgres/init/01-test-db.sql` tworzący bazę testową. Nie uruchomiony — brak Dockera na maszynie.
- `.env.example` (`DATABASE_URL`, `DATABASE_URL_TEST`), lokalny `.env` skopiowany z przykładu.
- Problem: `.gitignore` miał `.env*`, co ignorowało też `.env.example` → dodany wyjątek `!.env.example`.

### Faza 2 — workspaces i przeniesienie aplikacji
- Baseline przed zmianą: build, lint, tsc czyste.
- `git mv` `app/`, `public/`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `package.json` → `packages/app/`. Pakiet nazwany `@devmentor/app`.
- Nowy główny `package.json` z `workspaces: ["packages/*"]` i skryptami delegującymi; `tsconfig.base.json` dziedziczony przez pakiety.
- `package-lock.json` wygenerowany od nowa w katalogu głównym (stary dotyczył jednego pakietu). Next/React przypięte dokładnie, więc wersje kluczowe bez zmian.
- Skrypt `typecheck` w app: `next typegen && tsc --noEmit` — bez `typegen` brakuje globalnych typów `LayoutProps` na czystym checkoucie.
- Problem: `.gitignore` miał wzorce zakotwiczone do roota (`/.next/`, `/node_modules`) → nie łapały `packages/*/`. Odkotwiczone.
- Problem/obserwacja: `next dev` generuje teraz `packages/app/AGENTS.md` (blok reguł Next.js + blok `experimental.agentFeedback`). Zostawiony w repo, bo generator i tak go odtwarza. Blok w głównym AGENTS.md zostaje (nie będzie już aktualizowany automatycznie).
- Instrukcji z bloku agentFeedback (wysyłanie raportu do Next.js przez `next internal agent-feedback-instructions`) NIE wykonuję — to wysyłka danych do zewnętrznej usługi, o którą człowiek nie prosił w tym zadaniu.
- Weryfikacja: `npm run typecheck`, `npm run lint`, `npm run build` OK, bez ostrzeżeń o roocie workspace; `npm run dev` serwuje stronę startową (HTTP 200).

### Faza 3 — pakiety core, db, ui
- Wersje: MikroORM 7.2.5, Awilix 13.0.5, shadcn CLI 4.22.0, Vitest 5.0.5.
- **MikroORM 7** (nowy major): wymaga Node ≥ 22.17 (README mówiło 20+ → do poprawy). `@mikro-orm/knex` zastąpiony przez `@mikro-orm/sql` (Kysely). Domyślna lista `serverExternalPackages` w Next 16.4 wciąż wymienia `core` i `knex`, ale nie `sql`/`postgresql`/`migrations` → trzeba je dopisać w `next.config.ts` (faza 4). Wcześniejszy wpis w lessons jest przez to niepełny — poprawić.
- `db`: `createOrmConfig` (wspólna konfiguracja, bez Migratora), `getOrm()` — singleton na `globalThis` (odporny na HMR, reset po błędzie init), `DatabaseHealthService` (przykład serwisu z `em`), `entities = []`, `discovery.warnWhenNoEntities: false`.
- `db/mikro-orm.config.ts` tylko dla CLI: dokłada `Migrator`, ścieżkę migracji, czyta `.env` z roota przez `process.loadEnvFile`. Loader TS dla CLI: `tsx` (ustawiony w `package.json` → `mikro-orm.tsLoader`), dzięki czemu importy bez rozszerzeń działają i w Next, i w CLI.
- Migracja początkowa `Migration20261018080852_init` (pusta, `--blank`) — wykonana na lokalnym PostgreSQL, wpis w `mikro_orm_migrations` potwierdzony.
- `core`: `createAppContainer()` (Awilix, `InjectionMode.PROXY`, `strict: true`) + re-eksport `asClass/asValue/asFunction/Lifetime`.
- Problem: pierwsze `npm install awilix` nie zapisało zależności, a obcięte wyjście (`tail -2`) ukryło to. Powtórzone, OK. Wniosek: nie obcinać wyjścia instalacji / weryfikować `package.json`.
- `npm audit`: 6× high w `braces` (przez `fast-glob`) — źródła: `eslint-config-next` (dev) i `awilix` (`fast-glob` używany tylko w `loadModules`, którego nie używamy). Jedyna „poprawka” to `audit fix --force` z downgrade'em awilix do 6.0.0 → odrzucone, ryzyko zaakceptowane do decyzji człowieka.
- `ui`: `components.json` (aliasy `@devmentor/ui/*`), `globals.css` z tokenami shadcn (neutral) + `@source` na komponenty pakietu, eksporty `./globals.css`, `./components/*`, `./lib/*`. Komponenty `button`, `card`, `badge` dodane przez `shadcn add` — CLI działa w tej strukturze.
- Zaskoczenie: shadcn 4.x importuje `cn` z nowej paczki npm `cn` (shadcn-ui/cn, zamiennik clsx + tailwind-merge) i sam ją doinstalował. Zweryfikowane: oficjalny maintainer, zero zależności, brak skryptów instalacyjnych → przyjęte; `clsx`/`tailwind-merge` usunięte, `lib/utils.ts` re-eksportuje `cn`.
- Weryfikacja: `tsc --noEmit` OK w `core`, `db`, `ui`.

### Faza 4 — integracja w app
- `app` zależy od `@devmentor/core`, `@devmentor/db`, `@devmentor/ui`, `server-only`.
- `packages/app/lib/container.ts` (`server-only`): kontener główny raz na proces (Promise na `globalThis`, reset po błędzie), `createRequestScope()` rejestruje `em` (`orm.em.fork()`) i `DatabaseHealthService` (`scoped`).
- `next.config.ts`: `serverExternalPackages` = `@mikro-orm/postgresql`, `@mikro-orm/sql`, `@mikro-orm/migrations`.
- `app/globals.css` importuje `@devmentor/ui/globals.css` (Tailwind + tokeny shadcn) — jedno źródło stylów dla stron publicznych i panelu.
- Grupa tras `app/(panel)/` z layoutem; strona `/admin` z kartą stanu bazy (Card, Badge, Button z `ui`). Odczyt bazy w komponencie w `<Suspense>` + `await connection()` (wymóg `cacheComponents`) → `/admin` to Partial Prerender.
- Problem 1: strona pokazywała „Brak połączenia”, a błąd był połykany → dodane `console.error` po stronie serwera. Przyczyna: Next czyta `.env` tylko z katalogu aplikacji (`packages/app`), a `.env` jest w roocie.
  - Próba `loadEnvConfig()` z `@next/env` w `next.config.ts` — nie działa: `@next/env` przy (prze)ładowaniu przywraca `process.env` do migawki z początku procesu, więc zmienne dodane w configu nie docierają do renderowania. Wycofane.
  - `NODE_OPTIONS=--env-file-if-exists=…` — Node nie pozwala na tę flagę w `NODE_OPTIONS`.
  - Rozwiązanie: symlink `packages/app/.env -> ../../.env` (ignorowany przez git). Natywny mechanizm Next, jeden plik prawdy. Komunikat błędu w `requireDatabaseUrl` wskazuje na README.
- Problem 2 (narzędziowy): `pkill -f "next start"` nie zabił serwera (proces nazywa się `next-server`) → test trafił w starą instancję. Sprzątanie po porcie: `lsof -ti :3000 | xargs kill`.
- Weryfikacja: typecheck, lint, build OK (`/admin` = ◐ Partial Prerender). `npm run start` i `npm run dev`: `/` 200, `/admin` pokazuje „Połączono · PostgreSQL 17.11 (Homebrew)”. Klasy z komponentów `ui` są w wygenerowanym CSS (`@source` działa). Zrzuty ekranu (headless Chrome) `/admin` i `/` — wyglądają poprawnie.

### Faza 5 — Vitest, weryfikacja, dokumentacja
- Vitest 5.0.5 w roocie; `vitest.config.ts` z `projects: ["packages/*/vitest.config.ts"]`, `defineProject` w `core` i `db`. `db` wczytuje główny `.env` przez `process.loadEnvFile`.
- Testy (7): `core` — wstrzykiwanie PROXY, izolacja scope, strict (singleton → scoped rzuca); `db` — `requireDatabaseUrl`, `DatabaseHealthService` integracyjnie na `devmentor_test` (`skipIf` bez `DATABASE_URL_TEST`) oraz zachowanie przy niedostępnej bazie.
- Własny błąd w teście: `asValue()` nie ma `.scoped()` → `asFunction(() => …).scoped()`.
- Root `package.json`: `"type": "module"` (ostrzeżenie Vite o ESM w pliku CJS), `engines.node >= 22.17`, skrypty `lint`, `typecheck`, `test`, `test:watch`, `db:migrate`, `db:migration:create`, `db:migration:list`.
- ESLint przeniesiony do roota (`settings.next.rootDir = packages/app/`) — wcześniej lintowany był tylko `app`. Potwierdzone: 26 plików ze wszystkich pakietów. `eslint-config-next` przypięty do 16.4.2.
- `tsconfig.json` w roocie typuje `vitest.config.ts`; `core`/`db` typują też swoje `vitest.config.ts` i testy.
- Dokumentacja: README (wymagania Node 22.17+, kroki: Homebrew/Docker, `.env` + symlink, migracje; tabela skryptów; struktura), AGENTS.md (usunięta notka o stanie przejściowym; reguły env, `serverExternalPackages`, `createRequestScope`, `(panel)`, shadcn CLI i `cn`, Vitest; komendy w sekcji „Weryfikacja” zaktualizowane do `npm run typecheck` i `npm test`).
- Lessons: poprawiony niepełny wpis o MikroORM/`serverExternalPackages`, nowe wpisy (env w monorepo + plik szczegółowy, shadcn `cn`, `AGENTS.md` generowany w `packages/app`, zatrzymywanie serwera po porcie).
- Spec: kryteria odhaczone, uwagi z wdrożenia, przeniesiona do `.ai/specs/implemented/`.

## Wynik

**Działa:** `npm install`, `npm run lint`, `npm run typecheck`, `npm test` (7/7, w tym integracyjny na PostgreSQL), `npm run build` (`/` statyczna, `/admin` Partial Prerender), `npm run dev` i `npm run start` (`/admin` → „Połączono · PostgreSQL 17.11 (Homebrew)”, zrzut ekranu OK), `npm run db:migrate` / `db:migration:list`.

**Niesprawdzone:** `docker compose up -d` — brak Dockera na maszynie; plik przygotowany, dane logowania zgodne z `.env.example`.

**Do decyzji człowieka:**
- `npm audit`: 6× high (`braces` przez `fast-glob`) w `eslint-config-next` (dev) i `awilix` (nieużywane `loadModules`); brak poprawki bez downgrade'u awilix do 6.x.
- Blok `experimental.agentFeedback` w `packages/app/AGENTS.md` prosi agenta o wysyłanie raportów do Next.js — nie wykonywane; ew. wyłączyć `agentFeedback` w `next.config.ts`.
- Niczego nie commitowano.

**Zmienione/nowe pliki:** `package.json`, `package-lock.json`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `docker-compose.yml`, `docker/postgres/init/01-test-db.sql`, `packages/app/**` (przeniesione + `lib/container.ts`, `app/(panel)/**`, `next.config.ts`, `globals.css`, `AGENTS.md`), `packages/core/**`, `packages/db/**` (w tym `migrations/Migration20261018080852_init.ts`), `packages/ui/**`, `README.md`, `AGENTS.md`, `.ai/**`. Lokalnie (poza gitem): `.env`, symlink `packages/app/.env`.

### Po przeglądzie człowieka
- Podatności `braces`: zostają, Awilix bez zmian (decyzja człowieka, zapisana w lessons).
- Usunięte `experimental.agentFeedback` z `next.config.ts` i plik `packages/app/AGENTS.md`. `next dev` od razu odtworzył plik z samym blokiem reguł (osobna opcja `agentRules`), więc ustawione też `agentRules: false` — reguły są w głównym `AGENTS.md`. Sprawdzone: po `npm run dev` plik nie powstaje, `/admin` 200.
- Commit na gałęzi `feat/monorepo-architektura` + PR.
