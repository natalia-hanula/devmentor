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
- [Vitest](https://vitest.dev) — testy jednostkowe (pokrycie 100%) i integracyjne
- [testcontainers](https://testcontainers.com) + [agent-browser](https://github.com/vercel-labs/agent-browser) — PostgreSQL i przeglądarka w testach integracyjnych
- [GitHub Actions](https://docs.github.com/actions) — CI dla każdego pull requesta
- npm workspaces — monorepo
- [GitHub](https://github.com/natalia-hanula/devmentor) — repozytorium i kontrola wersji
- [Claude Code](https://claude.com/claude-code) — asystent AI wspierający development

## Uruchomienie lokalne

Wymagania: **Node.js 22.17+** (wymóg MikroORM 7), npm oraz PostgreSQL 17.

### Szybko: `npm run setup`

Uruchom PostgreSQL z rolą `devmentor` (zob. krok 2 poniżej): `npm run db:up` (skrót dla `docker compose up -d --wait` — czeka, aż healthcheck potwierdzi gotowość bazy) tworzy ją sam, a przy Homebrew wykonaj `CREATE ROLE` z kroku 2, bez tworzenia baz. Potem:

```bash
git clone https://github.com/natalia-hanula/devmentor.git
cd devmentor
npm run setup
npm run dev
```

Instalator wykonuje kroki 1–4 z części „Ręcznie”: `npm install`, `.env` z `.env.example`, symlink `packages/app/.env`, brakujące bazy `devmentor` i `devmentor_integration`, migracje. Każdy krok najpierw sprawdza, czy jest już zrobiony, więc ponowne uruchomienie jest bezpieczne. Istniejącego `.env` nigdy nie nadpisuje, tylko dopisuje brakujące `AUTH_JWT_SECRET` (losowy, 48 bajtów) i `APP_ENV=local`. Nie instaluje i nie uruchamia PostgreSQL: gdy baza pod `DATABASE_URL` nie odpowiada, wypisuje, co zrobić, i kończy się błędem. Konta operatora nie zakłada — na końcu przypomina o `npm run operator:create` (krok 5). Konta testowe zakłada osobno `npm run db:seed` (krok 6). Działa na macOS i Linuksie. Na Windows wykonaj kroki ręcznie.

> Na Node 22 instalator wypisuje ostrzeżenie `ExperimentalWarning` o type stripping. To jest oczekiwane.

### Ręcznie

#### 1. Kod i zależności

```bash
git clone https://github.com/natalia-hanula/devmentor.git
cd devmentor
npm install
```

#### 2. Baza danych

**Wariant A — Homebrew (macOS):**

```bash
brew install postgresql@17
brew services start postgresql@17
psql -h localhost -d postgres <<'SQL'
CREATE ROLE devmentor WITH LOGIN PASSWORD 'devmentor' CREATEDB;
CREATE DATABASE devmentor OWNER devmentor;
CREATE DATABASE devmentor_integration OWNER devmentor;
SQL
```

> `psql` z `postgresql@17` nie trafia automatycznie do `PATH` — użyj `/opt/homebrew/opt/postgresql@17/bin/psql` albo dodaj ten katalog do `PATH`.

**Wariant B — Docker:**

```bash
npm run db:up   # skrót dla: docker compose up -d --wait
```

`docker-compose.yml` tworzy tę samą rolę oraz bazy `devmentor` i `devmentor_integration`, więc ten sam `.env` działa w obu wariantach.

> Jeśli na porcie 5432 działa już lokalny PostgreSQL (np. z Homebrew), kontener wystartuje, ale `localhost:5432` trafi do lokalnego serwera. Przed użyciem bazy z Dockera zatrzymaj go: `brew services stop postgresql@17`.

#### 3. Zmienne środowiskowe

```bash
cp .env.example .env
ln -s ../../.env packages/app/.env
```

Bez instalatora dopisz do `.env` sekret sesji (min. 32 bajty; polecenie jest w `.env.example`). Zmiana `AUTH_JWT_SECRET` wylogowuje wszystkich użytkowników. `APP_ENV` (`local`, `test`, `staging`, `production`) mówi, gdzie działa aplikacja; brak wpisu oznacza `production`, czyli najostrzejsze reguły.

`.env` jest jeden, w katalogu głównym. Next.js czyta `.env` tylko z katalogu aplikacji, dlatego `packages/app/.env` jest symlinkiem do pliku głównego.

#### 4. Migracje i start

```bash
npm run db:migrate
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000), panel admina (ze stanem połączenia z bazą) pod [http://localhost:3000/admin](http://localhost:3000/admin), a słownik technologii pod [http://localhost:3000/admin/technologies](http://localhost:3000/admin/technologies). Panel operatora i zapisy w słowniku wymagają zalogowania kontem z rolą `operator` (krok 5); logowanie i rejestracja: [http://localhost:3000/login](http://localhost:3000/login).

#### 5. Konto operatora

```bash
npm run operator:create
```

Skrypt pyta o e-mail, wyświetlaną nazwę i hasło (min. 12 znaków; hasło wpisujesz bez echa i dwa razy). Hasła nie podaje się jako argumentu, żeby nie trafiło do historii powłoki. Konto dostaje wyłącznie rolę `operator` i od razu potwierdzony adres. Zapomniane hasło operatora: w wersji 1.0 załóż nowe konto operatora tym samym skryptem (reset hasła przez CLI wejdzie w etapie B). Instalator `npm run setup` tylko o tym przypomina — konta nie zakłada.

#### 6. Konta testowe (opcjonalnie)

```bash
npm run db:seed
```

Zakłada trzy fikcyjne konta z potwierdzonym adresem: `operator.test@example.com` (rola `operator`), `mentee.test@example.com` (`mentee`) i `mentor.test@example.com` (`mentee` + `mentor`, rolę nadaje konto operatora z seeda). Wszystkie mają hasło `test-haslo-nie-sekret` — to jawne dane testowe, nie sekret. Ponowne uruchomienie pomija istniejące konta. Przy `APP_ENV=production` (także gdy `APP_ENV` brak w `.env`) seed odmawia działania.

## Dostępne skrypty

Uruchamiane z katalogu głównego:

| Skrypt                                | Opis                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| `npm run setup`                       | Instalator środowiska lokalnego (idempotentny)              |
| `npm run dev`                         | Serwer deweloperski z hot reloadem                          |
| `npm run build`                       | Build produkcyjny                                           |
| `npm run start`                       | Uruchomienie buildu produkcyjnego                           |
| `npm run lint`                        | ESLint dla całego monorepo                                  |
| `npm run typecheck`                   | `tsc --noEmit` we wszystkich pakietach                      |
| `npm test`                            | Testy jednostkowe z pokryciem (próg 100%)                   |
| `npm run test:watch`                  | Vitest w trybie watch                                       |
| `npm run test:integration`            | Build + testy integracyjne (PostgreSQL, API, agent-browser) |
| `npm run db:up`                       | PostgreSQL w Dockerze (`docker compose up -d --wait`)       |
| `npm run db:migrate`                  | Wykonanie oczekujących migracji                             |
| `npm run db:migration:create`         | Nowa migracja na podstawie zmian w encjach                  |
| `npm run db:migration:list`           | Lista wykonanych migracji                                   |
| `npm run db:seed`                     | Konta testowe mentee, mentor, operator (hasło `test-haslo-nie-sekret`; odmowa przy `APP_ENV=production`) |
| `npm run operator:create`             | Konto operatora (interaktywnie, hasło bez echa)             |


## Testy i CI

- **Jednostkowe** — `npm test`. Vitest z pokryciem v8; każdy plik z zakresu musi mieć 100% linii, gałęzi, funkcji i instrukcji, inaczej polecenie kończy się błędem. Raport HTML: `coverage/index.html`.
- **Integracyjne** — `npm run test:integration`. Buduje aplikację, uruchamia PostgreSQL w kontenerze (testcontainers), wykonuje migracje, startuje `next start` i testuje API oraz UI przez `agent-browser`. Wymaga Dockera albo zmiennej `INTEGRATION_DATABASE_URL` wskazującej pustą bazę testową (setup czyści jej schemat):

  ```bash
  INTEGRATION_DATABASE_URL=postgresql://devmentor:devmentor@localhost:5432/devmentor_integration npm run test:integration
  ```

- **CI** — `.github/workflows/ci.yml` dla każdego pull requesta i pushu do `main`: lint + typecheck, testy jednostkowe (próg 100%), build bez bazy, testy integracyjne.

Zasady pisania testów są w [`AGENTS.md`](AGENTS.md) → „Testy i CI”.

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
tests/integration/            # testy integracyjne: global-setup, support/, *.int.test.ts
.github/workflows/ci.yml      # CI: lint, testy jednostkowe, build, testy integracyjne
docker-compose.yml            # PostgreSQL w Dockerze (alternatywa dla Homebrew)
.ai/                          # specyfikacje, logi, wnioski, dokumenty (docs/)
```

## O projekcie

DevMentor jest projektem edukacyjnym realizowanym w trakcie kursu **AI Tech Leaders**. Celem jest praktyczne przećwiczenie budowy produktu z wykorzystaniem narzędzi AI — w szczególności Claude Code — na każdym etapie: od planowania, przez implementację, po code review.
