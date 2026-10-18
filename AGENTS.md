<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Architektura i stack

DevMentor to monorepo. Poniższe założenia są wiążące — odstępstwo wymaga zmiany specyfikacji i zgody człowieka. Pełne standardy inżynieryjne (tabela nazewnictwa, zasady, checklista review, uzasadnienia) są w `.ai/docs/engineering-standards.md`; adaptacje tego dokumentu do naszego repo opisuje `.ai/specs/implemented/2026-10-18-standardy-inzynieryjne.md`. W razie sprzeczności obowiązuje ten plik.

### Stack

- **npm workspaces** (bez Turborepo/Nx — do decyzji, gdy pakietów przybędzie). Node.js ≥ 22.17 (wymóg MikroORM 7).
- **Next.js** (najnowsza wersja, App Router, włączone `cacheComponents`), **React**, **TypeScript** w trybie `strict`.
- **PostgreSQL** + **MikroORM 7** (encje, migracje, pula połączeń).
- **Awilix** — kontener DI. **Zod** — walidacja (wspólna dla klienta i serwera) i konfiguracja środowiska. **pino** — logger.
- **Tailwind CSS** dla stron publicznych, **shadcn/ui** dla stron backendowych (panele).
- **Vitest** do testów (`npm test` w katalogu głównym; każdy pakiet z testami ma własny `vitest.config.ts`).

### Pakiety (`packages/`)

| Pakiet | Nazwa | Odpowiedzialność |
| --- | --- | --- |
| `packages/app` | `@devmentor/app` | Next.js: strony, layouty, trasy API (`app/api/<koncepcja>/route.ts`). Tylko okablowanie HTTP i renderowanie. |
| `packages/core` | `@devmentor/core` | Logika biznesowa: serwisy, walidatory Zod, warstwa HTTP (`http/`), kontener DI (`container/`), `config/env.ts`, `logger.ts`. |
| `packages/db` | `@devmentor/db` | MikroORM: encje, konfiguracja, migracje. Jedyny pakiet importujący `@mikro-orm/*`. |
| `packages/ui` | `@devmentor/ui` | Komponenty interfejsu: prymitywy shadcn (`components/ui/`), komponenty koncepcji (`components/<koncepcja>/`), warstwa paneli (`backend/`). |

Nowe pakiety (np. `packages/shared`) dodajemy tylko po uzgodnieniu z człowiekiem.

### Reguły zależności

- Kierunek: `app → core → db` oraz `app → ui`. `ui` nie importuje żadnego pakietu wewnętrznego, `db` też nie. `core` nie importuje Next.js ani Reacta. Wymusza to ESLint (`no-restricted-imports` w `eslint.config.mjs`) — nie luzuj tych reguł dla wygody.
- `app` nie importuje `@devmentor/db` — po dane sięga przez serwisy z `core` (`withScope`).
- Tylko `db` importuje `@mikro-orm/*`; `core` korzysta z re-eksportów (`EntityManager`, `UniqueConstraintViolationException`, `isDatabaseUnavailableError` …).
- Importuj inne pakiety wyłącznie przez nazwę (`@devmentor/core`), nigdy ścieżką do ich `src/`.
- Kod trafiający do przeglądarki importuje z `core` wyłącznie `@devmentor/core/validators/*` (nie główny `@devmentor/core`, który ciągnie ORM i pino). Walidatory importują tylko `zod` i `@devmentor/db/constants`.
- Zależność instaluj w pakiecie, który jej używa (`npm install <pkg> -w @devmentor/<pakiet>`). Wyjątek: narzędzia całego repo (ESLint, Vitest, TypeScript) są w głównym `package.json`. Nie dodawaj zależności na coś, co pokrywa 20 linii własnego kodu.
- Pakiety wewnętrzne eksportują źródła TypeScript (pole `exports` → `src/`), bez kroku budowania.

### Konwencja koncepcji domenowych

Kod domenowy nie jest zorganizowany w `modules/`. Każda koncepcja (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews` …) to podkatalog o tej samej nazwie powtarzany w warstwach, które go potrzebują:

- `packages/db/src/entities/<koncepcja>/<nazwa>.entity.ts` (rejestracja w `entities/index.ts`)
- `packages/core/src/services/<koncepcja>/<nazwa>.service.ts` (rejestracja w `container/container.ts` i typ w `container/cradle.ts`)
- `packages/core/src/validators/<koncepcja>/<nazwa>-<akcja>.schema.ts` (obowiązkowo, gdy jest wejście create/update)
- `packages/app/app/api/<koncepcja>/route.ts` i strony w grupie tras persony
- `packages/ui/src/components/<koncepcja>/` (komponenty współdzielone przez strony tej koncepcji)

Folder koncepcji tworzymy dopiero z jej pierwszym plikiem — nigdy pustych szkieletów. To konwencja katalogów, nie runtime modułów: żadnych `setup.ts`/`acl.ts` per koncepcja ani auto-discovery. Wzorcem do kopiowania jest koncepcja `mentors` → `Technology` (encja, migracja, walidatory, `TechnologyService`, `api/technologies`, `/admin/technologies`).

Nazewnictwo (pełna tabela w standardach): pliki w kebab-case; encja `PascalCase` w `<nazwa>.entity.ts`, tabela snake_case w liczbie mnogiej (`tableName`), kolumny snake_case; serwis `<Nazwa>Service`; port integracji `<Nazwa>Gateway` w `<nazwa>.port.ts` + adaptery w `adapters/`; klucz w cradle camelCase; schema `<nazwa>Schema`; błąd domenowy `<Nazwa>Error` rozszerzający `AppError`; zdarzenie `koncepcja.encja.akcja` w czasie przeszłym (np. `bookings.booking.created`); strona `<segment>/page.tsx` z domyślnym eksportem `<Segment>Page`.

Zdarzenia domenowe (`core/src/events`, typowany emitter w cradle, tylko w procesie, bez kolejek) i porty integracji (płatności: interfejs w `core`, adapter mock na MVP) dodajemy dopiero z pierwszą funkcją, która ich potrzebuje.

### Wspólna warstwa API i UI

Każda trasa i każda strona korzysta z dwóch wspólnych warstw zamiast pisać własny fetch/walidację/auth/obsługę błędów:

- `packages/core/src/http/`:
  - `errors.ts` — hierarchia `AppError` (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError`). Serwisy rzucają tylko te błędy i nigdy nie budują odpowiedzi HTTP.
  - `api-handler.ts` — `apiHandler()` opakowuje każdą trasę: sprawdza nagłówek CSRF dla metod zmieniających stan, zwraca kopertę `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`, mapuje `AppError` i niedostępność bazy (503), loguje nieoczekiwane błędy, nie ujawnia stack trace'ów. `parseJsonBody()` / `parseInput()` walidują wejście schemą Zod. Żadna trasa nie pisze własnego `try/catch` ani `NextResponse.json`.
  - `make-crud-route.ts` — `export const { GET, POST, PUT, DELETE } = makeCrudRoute({ service, createSchema, updateSchema, access })` dla zwykłych zasobów CRUD (`PUT`/`DELETE` przez `?id=`). Przepływy (rezerwacja, płatność, przełożenie) używają `apiHandler` bezpośrednio i wołają serwisy przez `withScope`.
  - `auth.ts` — `requireSession`, `requireRole`, `assertOwnership`. Do czasu wdrożenia auth `getSession` zwraca zawsze `null`, więc chronione trasy odpowiadają 401 (fail closed). Dostęp w `makeCrudRoute` domyślnie wymaga sesji; `"public"` wpisuj jawnie.
- `packages/ui/src/backend/`:
  - `api/api-call.ts` — `apiCall` / `apiCallOrThrow`: jedyne dozwolone miejsce z `fetch()` do `/api/*` (ESLint blokuje `fetch` w `app` i `ui` poza tym plikiem). Dokleja nagłówek CSRF, bezpiecznie parsuje kopertę.
  - `forms/crud-form.tsx` — `CrudForm`: formularz z tej samej schemy Zod co trasa API, błędy serwera przy polach, Cmd/Ctrl+Enter wysyła, Escape anuluje. Każdy formularz create/edit.
  - `tables/data-table.tsx` — `DataTable`: lista z konfiguracji kolumn, stany ładowania/błędu/pustki, paginacja, akcje wierszy. Każdy ekran z listą.
  - `feedback/{loading-message,error-message,empty-state}.tsx` — jedyne komponenty stanów ładowania, błędu i pustki.
- Koperta API to konwencja kształtu, nie współdzielony typ: `core` i `ui` deklarują ją osobno (`ui` nie importuje `core`). Zmiana kształtu = zmiana w obu miejscach.

Gdzie trafia nowy komponent:

1. Prymityw shadcn → `ui/src/components/ui/`, tylko przez `cd packages/ui && npx shadcn@latest add <nazwa>`, nigdy ręcznie. Import: `@devmentor/ui/components/ui/<nazwa>`.
2. Ogólny wzorzec panelu, niezależny od koncepcji (nowy typ pola, renderer komórki, stan) → `ui/src/backend/<kategoria>/`.
3. Komponent związany z kształtem jednej koncepcji → `ui/src/components/<koncepcja>/`.
4. Komponent używany przez jedną stronę → obok tej `page.tsx`; do `components/<koncepcja>/` dopiero przy drugim użyciu.

### Baza danych (MikroORM)

- MikroORM działa wyłącznie po stronie serwera. Jedna instancja (pula połączeń) na proces — trzyma ją kontener w `core`; każde żądanie pracuje na własnym `EntityManager` (`em.fork()` w `withScope`).
- Encje przez `defineEntity` (bez dekoratorów z `emitDecoratorMetadata`), z `...baseProperties` z `entities/base.entity.ts` (UUID, `createdAt`, `updatedAt`). ID zawsze UUID.
- Limity kolumn, których używają walidatory, trzymaj w `db/src/constants.ts` (bez importów ORM).
- Każda zmiana schematu = migracja (`npm run db:migration:create -- --name <opis>`) zacommitowana razem z kodem, łącznie z `.snapshot-*.json`. Bez `schema:update` poza eksperymentami. Dane referencyjne (słowniki) mogą być osobną migracją.
- Unikalność i inne niezmienniki współdzielonego stanu pilnuje baza (constraint) i/lub transakcja w serwisie — nigdy check-then-write w dwóch zapytaniach.
- Wszystkie zapytania przez API encji/QueryBuilder MikroORM; żadnego SQL sklejanego z danymi użytkownika.
- Pakiety MikroORM ładujemy natywnie: `@mikro-orm/postgresql`, `@mikro-orm/sql`, `@mikro-orm/migrations` są w `serverExternalPackages` w `packages/app/next.config.ts`. Nowy pakiet `@mikro-orm/*` dopisz tam; nigdy do `transpilePackages`.
- Dostęp do bazy tylko w czasie żądania. Z włączonym `cacheComponents` nie używamy `export const dynamic` (Next 16 go odrzuca): trasy API są dynamiczne same z siebie, a Server Component czytający bazę opakowujemy w `<Suspense>` i zaczynamy od `await connection()`. Aplikacja musi się budować i startować bez dostępnej bazy.
- CLI migracji używa `packages/db/mikro-orm.config.ts`; wspólne ustawienia są w `createOrmConfig()`.

### Konfiguracja i logowanie

- Zmienne środowiskowe w jednym `.env` w katalogu głównym; `packages/app/.env` to symlink do niego (Next.js czyta `.env` tylko z katalogu aplikacji). Nie twórz osobnych `.env` w pakietach. Nową zmienną dopisz do schemy w `core/src/config/env.ts` i do `.env.example`.
- `parseEnv()` jest leniwe — nie wywołuj go na poziomie modułu (zepsułoby build bez `.env`).
- Loguj przez `getLogger()` / `logger` z cradle (pino). Nigdy `console.log` w kodzie produkcyjnym. Nowe pole z sekretem dopisz do `LOG_REDACT_PATHS` w `core/src/logger.ts`.

### Dependency Injection (Awilix)

- Kontener główny (`env`, `logger`, `orm`) powstaje raz na proces w `core/src/container/container.ts`; zależności żądania (`em`, serwisy) rejestruje `withScope()`. Każda zależność jawnie, ręcznie — bez `loadModules` i skanowania folderów. Nowy serwis = wpis w `registerRequestDependencies` + pole w `RequestCradle`.
- Zależności przez obiekt w konstruktorze (`InjectionMode.PROXY`), tryb `strict`. Domyślnie `scoped` dla serwisów z `em`, `singleton` dla bezstanowych narzędzi.
- Trasy i strony sięgają po serwisy wyłącznie przez `withScope((cradle) => …)`; nigdy przez `new` ani przez MikroORM bezpośrednio.

### Trasy i UI

- Grupy tras per persona w `packages/app/app/`: `(marketing)` (strony publiczne), `(auth)`, `(student)`, `(mentor)`, `(admin)`. Grupę tworzymy z pierwszą stroną danej persony.
- Strony publiczne: Tailwind. Strony backendowe (panele): komponenty z `@devmentor/ui`.
- Strony pobierają dane przez `apiCall` w komponentach klienckich, listy przez `DataTable`, formularze przez `CrudForm`, stany przez `feedback/*`.
- shadcn 4.x importuje `cn` z paczki npm `cn` (zamiennik `clsx` + `tailwind-merge`) — to oczekiwane.
- Style: `packages/app/app/globals.css` importuje `@devmentor/ui/globals.css`. Nie importuj `tailwindcss` drugi raz.
- Domyślnie Server Components; `"use client"` tylko tam, gdzie potrzebna jest interaktywność.

### Bezpieczeństwo — minimum

- Auth wymuszane po stronie serwera na każdej niepublicznej trasie; autoryzacja sprawdza konkretny rekord (własność), nie tylko „zalogowany”. Brak sprawdzenia własności = blocker, jak brak auth.
- Błąd w decyzji bezpieczeństwa → odmowa (fail closed).
- Trasa zapisująca przekazuje do serwisu wyłącznie sparsowany kształt Zod — nigdy surowe body do `em.create()`/`em.assign()` (mass assignment).
- Kwoty (cena sesji) zawsze liczone po stronie serwera; wartość od klienta nie jest zapisywana.
- Ochrona CSRF: nagłówek `x-devmentor-request` (dokleja go `apiCall`, sprawdza `apiHandler`) + ciasteczka `sameSite`.
- Przy wdrażaniu auth: `bcryptjs` z kosztem ≥ 12, JWT `HS256` z sekretem ≥ 32 bajtów z `env.ts`, ważność ~24 h bez refresh tokenów (znane ograniczenie), ciasteczko `httpOnly` + `secure` w produkcji + `sameSite=lax`, rate limiting na login/rejestrację, ogólne komunikaty błędów logowania.
- Sekrety tylko w `.env`; żaden sekret, token ani hasło nie trafia do logów ani odpowiedzi.

### Jakość kodu i review

- Bez `any`; zawężaj typy w czasie wykonania. Komentarz tylko dla nieoczywistego „dlaczego”.
- Wczesne `return` zamiast zagnieżdżeń; żadnych pustych `catch` — obsłuż, zaloguj z kontekstem albo rzuć dalej.
- Bez magicznych liczb i napisów — nazwana stała z uzasadnieniem, jeśli wartość nie jest oczywista.
- Bez funkcji „na zapas” (RBAC, multi-tenant, kolejki) i bez martwego, zakomentowanego kodu.
- Diff PR-a wynika w całości z jego celu — bez przypadkowych zmian nazw i formatowania.
- Przed review przejdź checklistę z sekcji „Code Review Checklist” w `.ai/docs/engineering-standards.md` (struktura, bezpieczeństwo, testy). Zmiana zachowania ma test, który nie przechodzi na starym kodzie; przepływy wrażliwe na wyścigi (rezerwacje) mają test integracyjny przypadku równoczesnego.

## Katalog `.ai/` — pamięć i proces pracy agentów

Wszystkie artefakty pracy AI (specyfikacje, logi przebiegów, wnioski, dokumenty referencyjne) trzymamy w `.ai/`. Korzystanie z tej struktury jest **obowiązkowe** — nie twórz takich plików w innych miejscach repozytorium (np. w katalogu głównym, `docs/` czy `tmp/`).

```
.ai/
├── docs/                  # dokumenty referencyjne projektu (np. engineering-standards.md)
├── specs/                 # specyfikacje SDD w toku (szkice i zatwierdzone, jeszcze niewdrożone)
│   ├── implemented/       # specyfikacje w pełni wdrożone
│   └── archive/           # specyfikacje porzucone lub zastąpione
├── runs/                  # logi autonomicznych przebiegów AI
├── lessons.md             # indeks wniosków — krótkie, jednolinijkowe wpisy
└── lessons/               # dłuższe opisy wniosków, do których linkuje lessons.md
```

### Nazewnictwo plików

- Pliki w `docs/` mają stałą nazwę bez daty (to dokumenty żywe, aktualizowane w miejscu).
- Pliki w `specs/` (w tym w podkatalogach), `runs/` i `lessons/` mają nazwę `YYYY-MM-DD-slug.md`, np. `2026-10-18-rezerwacja-sesji.md`.
- `YYYY-MM-DD` to data utworzenia pliku. Nie zmieniaj jej przy przenoszeniu ani edycji.
- `slug` pisz małymi literami, bez polskich znaków, ze słowami rozdzielonymi myślnikami (`kebab-case`), i ogranicz go do kilku słów.

### Przed rozpoczęciem pracy

1. Przeczytaj `.ai/lessons.md` i otwórz pliki z `.ai/lessons/`, które dotyczą Twojego zadania. Przy nowej koncepcji lub większej zmianie przeczytaj też `.ai/docs/engineering-standards.md`.
2. Sprawdź `.ai/specs/`, czy zadanie nie ma już specyfikacji. Jeśli ma, traktuj ją jako źródło prawdy dla zakresu i kryteriów akceptacji.

### Specyfikacje (SDD)

- Nowa funkcjonalność lub większa zmiana zaczyna się od specyfikacji w `.ai/specs/`. Kod piszesz dopiero po jej akceptacji przez człowieka.
- Specyfikacja zawiera co najmniej: cel, zakres (co wchodzi, a co nie), wymagania, kryteria akceptacji i otwarte pytania.
- Jeśli podczas implementacji okaże się, że trzeba odejść od specyfikacji, najpierw ją zaktualizuj i zgłoś zmianę człowiekowi.
- Po pełnym wdrożeniu przenieś plik do `.ai/specs/implemented/` za pomocą `git mv`. Specyfikację porzuconą lub zastąpioną przenieś do `.ai/specs/archive/` i dopisz na górze pliku powód (oraz odnośnik do specyfikacji, która ją zastąpiła).

### Logi przebiegów (`runs/`)

- Każdy autonomiczny przebieg (praca bez bieżącego nadzoru człowieka, np. wielokrokowa implementacja, pętla, zadanie w tle) **musi** mieć log w `.ai/runs/YYYY-MM-DD-slug.md`. Utwórz go na początku przebiegu i uzupełniaj na bieżąco, nie dopiero na końcu.
- Log zawiera: cel i powiązaną specyfikację, kolejne kroki z decyzjami i ich uzasadnieniem, napotkane problemy, zmienione pliki, wynik (co działa, co nie, co zostało do zrobienia).
- Jeśli tego samego dnia jest kilka przebiegów o podobnym temacie, rozróżnij je slugiem (np. `-2`).

### Lessons

Zapisuj wnioski, gdy:

- naprawisz błąd, którego przyczyna nie była oczywista;
- odkryjesz pułapkę w stacku, narzędziach lub konwencjach projektu (np. różnice w tej wersji Next.js);
- człowiek poprawi Twoje podejście albo potwierdzi nieoczywistą decyzję — zapisz to od razu, zanim wrócisz do zadania, tak by ten sam błąd się nie powtórzył;
- ustalisz coś, co trzeba pamiętać długoterminowo.

Zasady:

- Każdy wniosek to jednolinijkowy wpis w `.ai/lessons.md` (najnowsze na górze, format opisany w pliku).
- Jeśli wniosek wymaga kontekstu (objawy, przyczyna, rozwiązanie, jak zapobiegać), opisz go w `.ai/lessons/YYYY-MM-DD-slug.md` i podlinkuj z wpisu w indeksie.
- Zanim dodasz nowy wpis, sprawdź, czy podobny już istnieje. Jeśli tak, zaktualizuj go zamiast dublować. Wnioski, które okazały się błędne, usuń.
- Nie zapisuj tego, co wynika wprost z kodu lub historii gita.
- Jeśli wniosek to reguła, którą każdy agent musi stosować zawsze, zaproponuj człowiekowi dopisanie jej do `AGENTS.md`.

## Sposób pracy

### Planowanie

- Zadanie złożone (kilka kroków, wiele plików lub decyzja architektoniczna) zaczynaj od planu: kroki, pliki do zmiany, sposób weryfikacji. Specyfikacja mówi *co* zbudować, plan — *jak*.
- Przy pracy interaktywnej pokaż plan człowiekowi przed implementacją. W autonomicznym przebiegu zapisz go na początku logu w `.ai/runs/`.
- Gdy coś idzie nie tak (rozwiązanie się komplikuje, kolejne poprawki nie pomagają, założenia okazują się błędne), zatrzymaj się i zaplanuj od nowa zamiast brnąć dalej.

### Naprawianie błędów

- Przy zgłoszeniu błędu (opis, logi, nieprzechodzący test) działaj samodzielnie: odtwórz problem, znajdź przyczynę źródłową i napraw ją. Nie maskuj objawów i nie dopytuj o szczegóły, które da się ustalić z kodu lub logów.
- Jeśli rozwiązanie działa, ale jest toporne, zaproponuj prostszą, czystszą wersję, zanim uznasz zadanie za skończone.

### Weryfikacja

Nie uznawaj zmiany za gotową, dopóki nie udowodnisz, że działa:

- uruchom w katalogu głównym `npm run lint`, `npm run typecheck` i `npm test`, a przy większych zmianach także `npm run build` i `npm audit` (nowe alerty zgłoś człowiekowi);
- jeśli w projekcie są testy dotyczące zmienionego kodu, uruchom je; nowa logika powinna dostać testy;
- zmiany w UI sprawdź w działającej aplikacji (`npm run dev`), a nie tylko w kodzie;
- sprawdź zmianę z kryteriami akceptacji specyfikacji;
- raportuj wynik zgodnie z prawdą: jeśli coś nie przeszło albo nie dało się tego sprawdzić, napisz to wprost.

### Subagenci

- Szerokie przeszukiwanie kodu, research i niezależne podzadania zlecaj subagentom, żeby nie zaśmiecać głównego kontekstu. Od subagenta oczekuj wniosków, nie zrzutów plików.
