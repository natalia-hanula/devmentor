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

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000), a panel admina (ze stanem połączenia z bazą) pod [http://localhost:3000/admin](http://localhost:3000/admin).

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
├── app/    # @devmentor/app  — aplikacja Next.js (trasy, layouty, Server Actions)
├── core/   # @devmentor/core — logika biznesowa, typy, serwisy, kontener DI
├── db/     # @devmentor/db   — MikroORM: konfiguracja, encje, repozytoria, migracje
└── ui/     # @devmentor/ui   — komponenty interfejsu wielokrotnego użytku (shadcn/ui)
```

Pakiety wewnętrzne eksportują źródła TypeScript bez kroku budowania — kompilują je Turbopack (w Next.js) i Vitest (w testach).

### Zależności między pakietami

```
        ┌──────────────┐
        │     app      │
        └──┬────┬────┬─┘
           │    │    │
           ▼    │    ▼
        ┌────┐  │  ┌────┐
        │ ui │  │  │ db │
        └─┬──┘  │  └─┬──┘
          ▼     ▼    ▼
        ┌──────────────┐
        │     core     │
        └──────────────┘
```

Zależności płyną tylko w dół: `core` nie zna żadnego innego pakietu, a `app` składa wszystko w całość.

### Warstwy

- **Prezentacja (`app` + `ui`)** — strony publiczne (katalog mentorów, profile) stylowane Tailwind CSS; panele (admin, mentor, uczeń) w grupie tras `app/(panel)/`, budowane z komponentów shadcn/ui z `@devmentor/ui`. Domyślnie Server Components.
- **Logika biznesowa (`core`)** — serwisy niezależne od Next.js, łatwe do testowania w izolacji.
- **Dane (`db`)** — PostgreSQL przez MikroORM 7 (encje definiowane przez `defineEntity`). Jedna pula połączeń na proces (`getOrm()`), osobny `EntityManager` dla każdego żądania. Zmiany schematu wyłącznie przez migracje w `packages/db/migrations`.

### Dependency Injection

Serwisy i repozytoria rejestrowane są w kontenerze **Awilix**. Kontener główny powstaje raz na proces, a dla każdego żądania tworzony jest scope z zależnościami kontekstowymi (np. `EntityManager`, zalogowany użytkownik). Trasy i Server Actions pobierają serwisy z kontenera zamiast tworzyć je ręcznie:

```tsx
const scope = await createRequestScope(); // packages/app/lib/container.ts
const health = await scope.cradle.databaseHealthService.check();
```

### Praca z agentami AI

Założenia architektoniczne i zasady pracy dla agentów kodujących są w [`AGENTS.md`](AGENTS.md). Specyfikacje, logi przebiegów i wnioski trzymamy w katalogu [`.ai/`](.ai/).

## Struktura repozytorium

```
packages/
├── app/
│   ├── app/              # trasy Next.js; app/(panel)/ — strony backendowe
│   ├── lib/container.ts  # kompozycja kontenera DI (scope na żądanie)
│   └── public/           # zasoby statyczne
├── core/src/             # kontener DI, logika biznesowa
├── db/
│   ├── src/              # konfiguracja ORM, encje, serwisy danych
│   ├── migrations/       # migracje MikroORM
│   └── mikro-orm.config.ts  # konfiguracja CLI migracji
└── ui/src/               # komponenty shadcn/ui, globals.css z tokenami
docker-compose.yml        # PostgreSQL w Dockerze (alternatywa dla Homebrew)
.ai/                      # specyfikacje, logi przebiegów AI, wnioski
```

## O projekcie

DevMentor jest projektem edukacyjnym realizowanym w trakcie kursu **AI Tech Leaders**. Celem jest praktyczne przećwiczenie budowy produktu z wykorzystaniem narzędzi AI — w szczególności Claude Code — na każdym etapie: od planowania, przez implementację, po code review.
