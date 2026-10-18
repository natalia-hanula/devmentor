# Monorepo i architektura bazowa DevMentor

- **Status:** wdrożona 2026-10-18 (log: `.ai/runs/2026-10-18-migracja-monorepo.md`)
- **Data:** 2026-10-18

## Cel

Przekształcić jednopakietowy projekt Next.js w monorepo z wydzielonymi pakietami `app`, `core`, `db` i `ui` oraz przygotować fundament techniczny: PostgreSQL + MikroORM, kontener DI Awilix, Tailwind dla stron publicznych i shadcn/ui dla panelu.

## Zakres

### Wchodzi

- Konfiguracja npm workspaces (`packages/*`) w głównym `package.json`.
- Przeniesienie obecnej aplikacji Next.js (`app/`, `public/`, `next.config.ts`, konfiguracja ESLint i TS) do `packages/app`.
- Utworzenie pakietów `packages/core`, `packages/db` i `packages/ui` ze szkieletem: `package.json`, `tsconfig.json`, `src/index.ts`.
- Wspólny `tsconfig.base.json` w katalogu głównym, z którego dziedziczą pakiety.
- `packages/db`: konfiguracja MikroORM dla PostgreSQL (`mikro-orm.config.ts`), skrypty migracji, odczyt połączenia z `DATABASE_URL`.
- `packages/core`: fabryka kontenera Awilix (`createContainer`) i konwencja rejestracji serwisów.
- `packages/app`: kontener tworzony raz na proces, scope na żądanie (request scope) z własnym `EntityManager` (`em.fork()`).
- `packages/ui`: konfiguracja shadcn/ui (`components.json`) i pierwszy komponent (np. `Button`) jako dowód działania.
- Skrypty w katalogu głównym delegujące do pakietów (`dev`, `build`, `start`, `lint`, `typecheck`, `db:migrate`, `db:migration:create`).
- `docker-compose.yml` z PostgreSQL (na przyszłość) i `.env.example`.
- Lokalny PostgreSQL 17 z Homebrew (usługa `brew services`) i baza projektu.
- Vitest skonfigurowany w workspace z pierwszymi testami (`core`, `db`).
- Grupa tras `packages/app/app/(panel)/` dla stron backendowych (shadcn/ui).

### Nie wchodzi

- Encje domenowe (mentor, uczeń, sesja itd.) — osobne specyfikacje.
- Uwierzytelnianie, płatności, wiadomości.
- CI/CD i deployment.

## Wymagania

1. Graf zależności jest jednokierunkowy: `app → ui, core, db`; `db → core`; `ui → core` (opcjonalnie); `core` nie zależy od żadnego pakietu wewnętrznego.
2. Pakiety mają nazwy w scope `@devmentor/*` i są importowane wyłącznie przez nazwę pakietu, nigdy ścieżką względną poza własny katalog.
3. Pakiety wewnętrzne udostępniają źródła TypeScript (bez osobnego kroku budowania). Turbopack transpiluje pakiety workspace automatycznie (zob. `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md`).
4. MikroORM działa tylko po stronie serwera. `@mikro-orm/core` i `@mikro-orm/knex` są domyślnie w `serverExternalPackages` Next.js — nie dodajemy ich do `transpilePackages` (Next.js rzuca błąd, gdy pakiet jest na obu listach).
5. Encje definiujemy bez dekoratorów zależnych od `emitDecoratorMetadata` (`defineEntity` / `EntitySchema`), bo SWC/Turbopack nie emitują metadanych typów w sposób, na którym opiera się reflect-metadata.
6. Jeden `MikroORM` (pula połączeń) na proces; każde żądanie dostaje własny `EntityManager` przez scope Awilix.
7. Strony publiczne stylujemy Tailwindem; panel (backend/admin) budujemy z komponentów shadcn/ui z `@devmentor/ui`. Oba korzystają z tej samej konfiguracji Tailwind 4.

## Kryteria akceptacji

- [x] `npm install` w katalogu głównym instaluje zależności wszystkich pakietów.
- [x] `npm run dev` uruchamia aplikację pod `http://localhost:3000`, strona startowa działa jak przed zmianą.
- [x] `npm run lint`, `npm run typecheck` (`tsc --noEmit` we wszystkich pakietach) i `npm run build` przechodzą.
- [x] Przy działającym PostgreSQL (Homebrew lub `docker compose up -d`) `npm run db:migrate` łączy się z PostgreSQL i wykonuje (pustą) migrację początkową.
- [x] Przykładowa trasa/akcja serwerowa rozwiązuje serwis z kontenera Awilix, który używa `EntityManager` z `@devmentor/db`.
- [x] Komponent z `@devmentor/ui` renderuje się w przykładowej stronie panelu (`app/(panel)/`) ze stylami shadcn.
- [x] `npm test` uruchamia Vitest i testy przechodzą.
- [x] README i AGENTS.md opisują faktyczną strukturę.

## Decyzje (2026-10-18)

1. Menedżer pakietów: **npm workspaces**.
2. Turborepo: **później**, nie w tej zmianie.
3. Strony backendowe = panel admina oraz panele mentora i ucznia, w grupie tras **`app/(panel)/`**.
4. Testy: **Vitest** (wchodzi do zakresu tej zmiany).
5. Encje: **`defineEntity`**, bez dekoratorów.
6. Wersja MikroORM: najnowsza stabilna dostępna w npm w dniu instalacji.

## Uwagi z wdrożenia

- Kryterium bazy sprawdzone na PostgreSQL 17 z Homebrew. Wariant `docker compose` nie był uruchamiany (brak Dockera na maszynie).
- Odstępstwa doprecyzowujące (bez zmiany zakresu): `.env` tylko w katalogu głównym + symlink `packages/app/.env`; konfiguracja ESLint przeniesiona do katalogu głównego; `@mikro-orm/postgresql|sql|migrations` dopisane do `serverExternalPackages` (MikroORM 7 nie jest na domyślnej liście Next).
