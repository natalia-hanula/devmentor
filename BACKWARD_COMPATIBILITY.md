# Zgodność wsteczna — DevMentor

Chronione powierzchnie kontraktu tego repozytorium i to, jak je zmieniać. Skille review sprawdzają zmiany względem tego pliku, a skille implementujące ostrzegają, gdy zmiana go narusza.

**Kontekst:** projekt jest przed pierwszym wydaniem (`0.1.0`). Nie ma zewnętrznych konsumentów API ani pakietów npm (wszystkie pakiety są `private`). Dla większości powierzchni łamiąca zmiana jest więc dozwolona bez okresu deprecjacji, pod warunkiem że PR zmienia wszystkich konsumentów naraz i nazywa zmianę wprost (`💥` w opisie PR-a). Wyjątkiem są **schemat bazy i migracje** — te chronimy już teraz. Gdy pojawi się pierwsze wdrożenie produkcyjne, zaostrz ten plik.

## Powierzchnie

### 1. Schemat bazy i migracje (`packages/db/migrations/`, `packages/db/src/entities/`)
- **Łamiące:** edycja lub usunięcie zacommitowanej migracji, zmiana nazwy lub usunięcie tabeli/kolumny, zawężenie typu, nowe `NOT NULL` bez wartości domyślnej, zmiana typu ID z UUID.
- **Ścieżka:** nigdy nie edytuj zmergowanej migracji — dodaj nową (`npm run db:migration:create -- --name <opis>`) razem z `.snapshot-*.json`. Zmianę nazwy lub usunięcie kolumny rób w krokach: dodaj nową kolumnę → przenieś dane → usuń starą w kolejnej migracji. PR z migracją ma `risk-high`, test migracji w górę i w dół oraz plan wycofania w opisie (zob. `SDLC.md`).

### 2. Koperta odpowiedzi API (`packages/core/src/http/api-handler.ts` ↔ `packages/ui/src/backend/api/types.ts`)
- Kształt `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }` oraz kody błędów `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS` (429), `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR` i ich statusy HTTP.
- **Łamiące:** zmiana nazwy lub usunięcie pola koperty, zmiana kodu błędu albo jego statusu, zmiana klucza `fieldErrors` (ścieżka pola łączona kropką, `_form` dla błędów ogólnych).
- **Ścieżka:** kopertę deklarują osobno `core` i `ui`, więc zmiana zawsze obejmuje oba pliki w jednym PR-ze, razem z testami obu stron i testem integracyjnym API.

### 3. Ochrona CSRF (`x-devmentor-request`)
- **Łamiące:** zmiana nazwy nagłówka, zawężenie lub poszerzenie zbioru metod bezpiecznych (`GET`, `HEAD`, `OPTIONS`).
- **Ścieżka:** zmiana jednocześnie w `apiHandler` (core) i `apiCall` (ui). Poluzowanie ochrony wymaga etykiety `security` i zgody człowieka.

### 4. Trasy HTTP (`packages/app/app/api/**/route.ts`)
- Obecnie: `GET /api/health`, `GET|POST|PUT|DELETE /api/technologies` (`PUT`/`DELETE` przez `?id=`; odczyt publiczny, zapisy wymagają sesji).
- **Łamiące:** usunięcie trasy lub metody, zmiana parametrów (`?id=`), zmiana kształtu `data`, zaostrzenie walidacji wejścia, zmiana poziomu dostępu z publicznego na chroniony (i odwrotnie — to zmiana bezpieczeństwa).
- **Ścieżka:** zaktualizuj wszystkich konsumentów w `ui`/`app` w tym samym PR-ze. Poszerzenie dostępu (`"public"`) wymaga uzasadnienia w PR-ze i etykiety `security`.

### 5. Trasy stron (`packages/app/app/(persona)/…/page.tsx`)
- Obecnie: `/`, `/admin`, `/admin/technologies`.
- **Łamiące:** zmiana lub usunięcie publicznego adresu URL z grupy `(marketing)`.
- **Ścieżka:** przed wydaniem — zmiana dozwolona z aktualizacją linków. Po wydaniu — przekierowanie (`redirects` w `next.config.ts`) dla starego adresu.

### 6. Eksporty pakietów wewnętrznych (pole `exports` w `packages/*/package.json`)
- `@devmentor/core`: `.`, `./validators/*`; `@devmentor/db`: `.`, `./constants`; `@devmentor/ui`: `./globals.css`, `./lib/*`, `./components/*`, `./backend/api/*`, `./backend/*`.
- **Łamiące:** usunięcie lub zmiana nazwy ścieżki eksportu albo eksportowanego symbolu, zmiana sygnatury publicznej funkcji (`apiHandler`, `makeCrudRoute`, `withScope`, `apiCall`, `CrudForm`, `DataTable` …).
- **Ścieżka:** monorepo bez publikacji — zmień wszystkich importujących w tym samym PR-ze; `npm run typecheck` i `npm run lint` muszą przejść. Nie dodawaj importów omijających `exports` (ścieżki do `src/`).

### 7. Zmienne środowiskowe (`packages/core/src/config/env.ts`, `.env.example`)
- Obecnie w schemie: `DATABASE_URL` i `AUTH_JWT_SECRET` (wymagane), `NODE_ENV`, `LOG_LEVEL`, `APP_BASE_URL`, `APP_ENV` (z wartościami domyślnymi) oraz `MAIL_ADAPTER` (opcjonalna: `outbox` | `noop`; domyślna wynika z `APP_ENV` — `noop` przy `production`, inaczej `outbox`; `outbox` przy `APP_ENV=production` blokuje start). `INTEGRATION_DATABASE_URL` czyta tylko setup testów integracyjnych, nie schema.
- **Łamiące:** zmiana nazwy lub usunięcie zmiennej, nowa zmienna wymagana bez wartości domyślnej, zaostrzenie walidacji.
- **Ścieżka:** zaktualizuj schemę i `.env.example` razem, opisz zmianę w PR-ze. Build musi przechodzić bez `.env` (`parseEnv()` pozostaje leniwe).

### 8. Skrypty `npm` i CI (`package.json`, `.github/workflows/ci.yml`, `.ai/agentic.config.json`)
- Skrypty `lint`, `typecheck`, `test`, `build`, `test:integration`, `db:*` są używane przez CI, dokumentację i bramkę walidacji agentów.
- **Łamiące:** zmiana nazwy lub usunięcie skryptu, obniżenie progu pokrycia, usunięcie zadania CI.
- **Ścieżka:** zaktualizuj w jednym PR-ze `package.json`, `ci.yml`, `validation.commands` w `.ai/agentic.config.json`, sekcję „Validation gate” w `SDLC.md` i `AGENTS.md`. Obniżenie progów wymaga zgody człowieka.

## Poza zakresem (na razie)

Zdarzenia domenowe, webhooki i porty integracji (płatności) jeszcze nie istnieją. Gdy dodasz pierwsze z nich, dopisz tu sekcję: nazwy zdarzeń (`koncepcja.encja.akcja`) i kształt ich ładunku staną się kontraktem.
