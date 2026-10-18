# DevMentor

**DevMentor** to marketplace mentoringowy dla programistów. Łączy doświadczonych mentorów z uczniami, którzy chcą rozwijać swoje umiejętności — od pierwszych kroków w programowaniu po przygotowanie do rozmów rekrutacyjnych i awans na wyższe stanowisko.

> Projekt powstaje w ramach kursu **AI Tech Leaders** i jest rozwijany z pomocą **Claude Code**.

## Funkcjonalności

- **Mentorzy** — publiczne profile z doświadczeniem, technologiami, stawką i dostępnością.
- **Uczniowie** — konta osób szukających wsparcia, z celami nauki i historią sesji.
- **Profile** — przeglądanie i wyszukiwanie mentorów po technologiach, poziomie i cenie.
- **Umawianie sesji** — rezerwacja terminów w kalendarzu mentora.
- **Wiadomości** — komunikacja między mentorem a uczniem przed sesją i po niej.
- **Płatności** — opłacanie sesji bezpośrednio na platformie.

> Projekt jest na wczesnym etapie — powyższa lista opisuje docelowy zakres, nie stan obecny.

## Stack technologiczny

- [Next.js](https://nextjs.org) 16 (App Router) + [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [PostgreSQL](https://www.postgresql.org) + [MikroORM](https://mikro-orm.io) — baza danych, encje, migracje, pula połączeń
- [Awilix](https://github.com/jeffijoe/awilix) — kontener Dependency Injection
- [Zod](https://zod.dev) — walidacja danych i konfiguracji
- [pino](https://getpino.io) — logowanie
- [Tailwind CSS](https://tailwindcss.com) 4 — strony frontendowe
- [shadcn/ui](https://ui.shadcn.com) — strony backendowe (panele)
- [Vitest](https://vitest.dev) — testy
- npm workspaces — monorepo
- [GitHub](https://github.com/natalia-hanula/devmentor) — repozytorium i kontrola wersji
- [Claude Code](https://claude.com/claude-code) — asystent AI wspierający development

## Uruchomienie lokalne

Wymagania: **Node.js 22.17+** (wymóg MikroORM 7), npm oraz PostgreSQL 17.

### 1. Kod i zależności

```bash
git clone https://github.com/natalia-hanula/devmentor.git
cd devmentor
npm install
```

### 2. Baza danych

**Wariant A — Homebrew (macOS):**

```bash
brew install postgresql@17
brew services start postgresql@17
psql -h localhost -d postgres <<'SQL'
CREATE ROLE devmentor WITH LOGIN PASSWORD 'devmentor' CREATEDB;
CREATE DATABASE devmentor OWNER devmentor;
CREATE DATABASE devmentor_test OWNER devmentor;
SQL
```

> `psql` z `postgresql@17` nie trafia automatycznie do `PATH` — użyj `/opt/homebrew/opt/postgresql@17/bin/psql` albo dodaj ten katalog do `PATH`.

**Wariant B — Docker:**

```bash
docker compose up -d
```

`docker-compose.yml` tworzy tę samą rolę oraz bazy `devmentor` i `devmentor_test`, więc ten sam `.env` działa w obu wariantach.

### 3. Zmienne środowiskowe

```bash
cp .env.example .env
ln -s ../../.env packages/app/.env
```

`.env` jest jeden, w katalogu głównym. Next.js czyta `.env` tylko z katalogu aplikacji, dlatego `packages/app/.env` jest symlinkiem do pliku głównego.

### 4. Migracje i start

```bash
npm run db:migrate
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000), panel admina (ze stanem połączenia z bazą) pod [http://localhost:3000/admin](http://localhost:3000/admin), a słownik technologii pod [http://localhost:3000/admin/technologies](http://localhost:3000/admin/technologies). Zapisy wymagają zalogowania, a auth nie jest jeszcze wdrożone, więc na razie serwer odpowiada na nie 401.

## Dostępne skrypty

Uruchamiane z katalogu głównego:

| Skrypt                                | Opis                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                         | Serwer deweloperski z hot reloadem                          |
| `npm run build`                       | Build produkcyjny                                           |
| `npm run start`                       | Uruchomienie buildu produkcyjnego                           |
| `npm run lint`                        | ESLint dla całego monorepo                                  |
| `npm run typecheck`                   | `tsc --noEmit` we wszystkich pakietach                      |
| `npm test`                            | Testy (Vitest) wszystkich pakietów                          |
| `npm run test:watch`                  | Vitest w trybie watch                                       |
| `npm run db:migrate`                  | Wykonanie oczekujących migracji                             |
| `npm run db:migration:create`         | Nowa migracja na podstawie zmian w encjach                  |
| `npm run db:migration:list`           | Lista wykonanych migracji                                   |

Testy integracyjne `db` korzystają z bazy `DATABASE_URL_TEST`. Bez niej są pomijane.

## Architektura

DevMentor jest monorepo opartym na npm workspaces. Kod dzieli się na pakiety w katalogu `packages/`:

```
packages/
├── app/    # @devmentor/app  — Next.js: strony, layouty, trasy API (tylko HTTP i renderowanie)
├── core/   # @devmentor/core — logika biznesowa: serwisy, walidatory Zod, warstwa HTTP, kontener DI
├── db/     # @devmentor/db   — MikroORM: encje, konfiguracja, migracje
└── ui/     # @devmentor/ui   — komponenty interfejsu (shadcn/ui) i warstwa budowania paneli
```

Pakiety wewnętrzne eksportują źródła TypeScript bez kroku budowania — kompilują je Turbopack (w Next.js) i Vitest (w testach). Szczegółowe standardy inżynieryjne są w [`.ai/docs/engineering-standards.md`](.ai/docs/engineering-standards.md), a ich wiążąca wersja dla tego repo w [`AGENTS.md`](AGENTS.md).

### Zależności między pakietami

```
        ┌──────────────┐
        │     app      │
        └───┬──────┬───┘
            │      │
            ▼      ▼
        ┌──────┐ ┌────┐
        │ core │ │ ui │
        └──┬───┘ └────┘
           ▼
        ┌──────┐
        │  db  │
        └──────┘
```

`app → core → db` oraz `app → ui`. `ui` i `db` nie importują żadnego pakietu wewnętrznego, `core` nie zna Next.js ani Reacta, a tylko `db` importuje `@mikro-orm/*`. Granice wymusza ESLint (`no-restricted-imports`).

### Warstwy

- **Prezentacja (`app` + `ui`)** — grupy tras per persona: `(marketing)` dla stron publicznych (Tailwind), `(admin)`, a z czasem `(auth)`, `(student)` i `(mentor)` dla paneli (shadcn/ui). Strony pobierają dane przez `apiCall`, listy renderują przez `DataTable`, formularze przez `CrudForm`.
- **HTTP (`core/src/http`)** — `apiHandler` (koperta `{ ok, data | error }`, mapowanie błędów, CSRF, logowanie), `makeCrudRoute` (trasy CRUD z konfiguracji), `auth` (sesja, role, własność rekordów).
- **Logika biznesowa (`core/src/services`)** — serwisy pogrupowane w foldery koncepcji (`services/mentors/technology.service.ts`). Rzucają typowane błędy (`NotFoundError`, `ConflictError` …), nigdy nie budują odpowiedzi HTTP. Walidatory Zod w `core/src/validators/<koncepcja>/` są wspólne dla trasy API i formularza.
- **Dane (`db`)** — PostgreSQL przez MikroORM 7 (`defineEntity`, UUID jako ID). Jedna pula połączeń na proces, osobny `EntityManager` dla każdego żądania. Zmiany schematu wyłącznie przez migracje w `packages/db/migrations`.

### Dependency Injection

Kontener **Awilix** w `core/src/container/` powstaje raz na proces (`env`, `logger`, `orm`). Każde żądanie dostaje własny scope z `EntityManager` i serwisami, rejestrowanymi jawnie, bez skanowania folderów. Trasa API to w praktyce konfiguracja:

```ts
// packages/app/app/api/technologies/route.ts
export const { GET, POST, PUT, DELETE } = makeCrudRoute({
  service: "technologyService",
  createSchema: technologyCreateSchema,
  updateSchema: technologyUpdateSchema,
  access: { read: "public" }, // zapisy domyślnie wymagają sesji
});

// przepływ niestandardowy
export const GET = apiHandler(async () => withScope((cradle) => cradle.databaseHealthService.check()));
```

### Praca z agentami AI

Założenia architektoniczne i zasady pracy dla agentów kodujących są w [`AGENTS.md`](AGENTS.md). Specyfikacje, logi przebiegów, wnioski i dokumenty referencyjne trzymamy w katalogu [`.ai/`](.ai/).

## Struktura repozytorium

```
packages/
├── app/app/
│   ├── (marketing)/          # strony publiczne
│   ├── (admin)/admin/        # panel admina: przegląd, technologie
│   └── api/                  # trasy API: health, technologies
├── core/src/
│   ├── config/env.ts         # walidacja zmiennych środowiskowych (Zod)
│   ├── container/            # kontener DI: container.ts, cradle.ts
│   ├── http/                 # errors, api-handler, make-crud-route, auth
│   ├── services/<koncepcja>/ # serwisy domenowe
│   ├── validators/<koncepcja>/ # schematy Zod (klient + serwer)
│   └── logger.ts             # pino z redakcją sekretów
├── db/
│   ├── src/entities/<koncepcja>/ # encje (defineEntity) + base.entity.ts
│   ├── migrations/           # migracje MikroORM
│   └── mikro-orm.config.ts   # konfiguracja CLI migracji
└── ui/src/
    ├── components/ui/        # prymitywy shadcn/ui
    ├── backend/              # api-call, crud-form, data-table, feedback
    └── styles/globals.css    # Tailwind + tokeny shadcn
docker-compose.yml            # PostgreSQL w Dockerze (alternatywa dla Homebrew)
.ai/                          # specyfikacje, logi, wnioski, dokumenty (docs/)
```

## O projekcie

DevMentor jest projektem edukacyjnym realizowanym w trakcie kursu **AI Tech Leaders**. Celem jest praktyczne przećwiczenie budowy produktu z wykorzystaniem narzędzi AI — w szczególności Claude Code — na każdym etapie: od planowania, przez implementację, po code review.
