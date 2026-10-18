<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Architektura i stack

DevMentor to monorepo. Poniższe założenia są wiążące — odstępstwo wymaga zmiany specyfikacji i zgody człowieka.

### Stack

- **npm workspaces** (bez Turborepo/Nx — do decyzji, gdy pakietów przybędzie). Node.js ≥ 22.17 (wymóg MikroORM 7).
- **Next.js** (najnowsza wersja, App Router, włączone `cacheComponents`), **React**, **TypeScript** w trybie `strict`.
- **PostgreSQL** jako baza danych, dostęp przez **MikroORM** (encje, migracje, pula połączeń).
- **Awilix** jako kontener Dependency Injection.
- **Tailwind CSS** dla stron frontendowych (publicznych).
- **shadcn/ui** dla stron backendowych (panel administracyjny i panele użytkowników).
- **Vitest** do testów (`npm test` w katalogu głównym; każdy pakiet z testami ma własny `vitest.config.ts`).

### Pakiety (`packages/`)

| Pakiet | Nazwa | Odpowiedzialność |
| --- | --- | --- |
| `packages/app` | `@devmentor/app` | Aplikacja Next.js: trasy, layouty, Server Actions, Route Handlers, kompozycja kontenera DI. |
| `packages/core` | `@devmentor/core` | Kod wielokrotnego użytku niezależny od frameworka: typy domenowe, logika biznesowa, serwisy, narzędzia, fabryka kontenera Awilix. |
| `packages/db` | `@devmentor/db` | Konfiguracja MikroORM, encje, repozytoria, migracje, seedy. |
| `packages/ui` | `@devmentor/ui` | Komponenty interfejsu wielokrotnego użytku (w tym komponenty shadcn/ui). |

Nowe pakiety dodajemy tylko po uzgodnieniu z człowiekiem.

### Reguły zależności

- Dozwolony kierunek: `app → ui, core, db`; `db → core`; `ui → core`. `core` nie importuje żadnego pakietu wewnętrznego ani Next.js/Reacta.
- Importuj inne pakiety wyłącznie przez nazwę (`@devmentor/db`), nigdy ścieżką względną typu `../../db/src`.
- Logika biznesowa należy do `core` (lub `db`, jeśli dotyczy dostępu do danych), nie do komponentów i tras w `app`.
- Zależność instaluj w pakiecie, który jej używa (`npm install <pkg> -w @devmentor/<pakiet>`), a nie w katalogu głównym. Wyjątek: narzędzia całego repo (ESLint, Vitest, TypeScript) są w głównym `package.json`.
- Pakiety wewnętrzne eksportują źródła TypeScript (pole `exports` → `src/`), bez kroku budowania — Turbopack i Vitest kompilują je same.

### Baza danych (MikroORM)

- MikroORM uruchamiaj wyłącznie po stronie serwera (Server Components, Server Actions, Route Handlers). Nie importuj `@devmentor/db` w komponentach `"use client"`.
- Jedna instancja `MikroORM` (pula połączeń) na proces; każde żądanie pracuje na własnym `EntityManager` (`em.fork()`), nigdy na globalnym.
- Encje definiuj przez `defineEntity` / `EntitySchema`, nie przez dekoratory oparte na `emitDecoratorMetadata` (SWC/Turbopack ich nie wspiera).
- Każda zmiana schematu = migracja wygenerowana w `packages/db` i zacommitowana razem z kodem. Nie używaj `schema:update` poza lokalnymi eksperymentami.
- Pakiety MikroORM ładujemy natywnie, nie bundlujemy: `@mikro-orm/postgresql`, `@mikro-orm/sql` i `@mikro-orm/migrations` są w `serverExternalPackages` w `packages/app/next.config.ts` (domyślna lista Next.js zna tylko `core` i stary `knex`). Nowy pakiet `@mikro-orm/*` dopisz tam; nigdy nie dodawaj ich do `transpilePackages`.
- Aplikacja bierze ORM z `getOrm()` (`@devmentor/db`), CLI migracji — z `packages/db/mikro-orm.config.ts`. Wspólne ustawienia trzymaj w `createOrmConfig()`, a nowe encje dopisuj do `packages/db/src/entities/index.ts`.
- Komponent, który czyta bazę, opakuj w `<Suspense>` i zacznij od `await connection()` (wymóg `cacheComponents`).
- Zmienne środowiskowe są w jednym `.env` w katalogu głównym; `packages/app/.env` to symlink do niego (Next.js czyta `.env` tylko z katalogu aplikacji). Nie twórz osobnych plików `.env` w pakietach.

### Dependency Injection (Awilix)

- Serwisy i repozytoria rejestruj w kontenerze; nie twórz ich ręcznie przez `new` w trasach i komponentach.
- Zależności przyjmuj przez konstruktor/parametr fabryki (wstrzykiwanie przez obiekt, `InjectionMode.PROXY`), co ułatwia testy z mockami.
- Kontener główny tworzony jest raz na proces; zależności związane z żądaniem (np. `em`, bieżący użytkownik) rejestruj w scope tworzonym na żądanie — `createRequestScope()` z `packages/app/lib/container.ts`. Nowe serwisy dopisuj tam i do typu `RequestCradle`.
- Kontener tworzy `createAppContainer()` z `@devmentor/core` (`PROXY` + `strict`) — nie wywołuj `createContainer` z awilix bezpośrednio.
- Domyślny czas życia: `SCOPED` dla serwisów korzystających z `em`, `SINGLETON` dla bezstanowych narzędzi i konfiguracji.

### UI

- Strony publiczne (landing, katalog mentorów, profile): Tailwind CSS.
- Strony backendowe (panel admina, panel mentora/ucznia): komponenty shadcn/ui z `@devmentor/ui`.
- Strony backendowe żyją w grupie tras `packages/app/app/(panel)/` (np. `(panel)/admin`, `(panel)/mentor`, `(panel)/uczen`) i dzielą jej layout.
- Komponenty shadcn dodawaj do `packages/ui` przez CLI, uruchamiane w tym katalogu: `cd packages/ui && npx shadcn@latest add <komponent>`. Importuj je jako `@devmentor/ui/components/<nazwa>`. Komponenty używane w jednym miejscu mogą zostać w `app`; przenieś je do `ui`, gdy pojawi się drugie użycie.
- shadcn 4.x importuje `cn` z paczki npm `cn` (zamiennik `clsx` + `tailwind-merge`) — to oczekiwane, nie poprawiaj tych importów.
- Style: `packages/app/app/globals.css` importuje `@devmentor/ui/globals.css` (Tailwind + tokeny shadcn). Nie importuj `tailwindcss` drugi raz w innym pliku.
- Domyślnie Server Components; `"use client"` tylko tam, gdzie potrzebna jest interaktywność.

## Katalog `.ai/` — pamięć i proces pracy agentów

Wszystkie artefakty pracy AI (specyfikacje, logi przebiegów, wnioski) trzymamy w `.ai/`. Korzystanie z tej struktury jest **obowiązkowe** — nie twórz takich plików w innych miejscach repozytorium (np. w katalogu głównym, `docs/` czy `tmp/`).

```
.ai/
├── specs/                 # specyfikacje SDD w toku (szkice i zatwierdzone, jeszcze niewdrożone)
│   ├── implemented/       # specyfikacje w pełni wdrożone
│   └── archive/           # specyfikacje porzucone lub zastąpione
├── runs/                  # logi autonomicznych przebiegów AI
├── lessons.md             # indeks wniosków — krótkie, jednolinijkowe wpisy
└── lessons/               # dłuższe opisy wniosków, do których linkuje lessons.md
```

### Nazewnictwo plików

- Pliki w `specs/` (w tym w podkatalogach), `runs/` i `lessons/` mają nazwę `YYYY-MM-DD-slug.md`, np. `2026-10-18-rezerwacja-sesji.md`.
- `YYYY-MM-DD` to data utworzenia pliku. Nie zmieniaj jej przy przenoszeniu ani edycji.
- `slug` pisz małymi literami, bez polskich znaków, ze słowami rozdzielonymi myślnikami (`kebab-case`), i ogranicz go do kilku słów.

### Przed rozpoczęciem pracy

1. Przeczytaj `.ai/lessons.md` i otwórz pliki z `.ai/lessons/`, które dotyczą Twojego zadania.
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

- uruchom w katalogu głównym `npm run lint`, `npm run typecheck` i `npm test`, a przy większych zmianach także `npm run build`;
- jeśli w projekcie są testy dotyczące zmienionego kodu, uruchom je; nowa logika powinna dostać testy;
- zmiany w UI sprawdź w działającej aplikacji (`npm run dev`), a nie tylko w kodzie;
- sprawdź zmianę z kryteriami akceptacji specyfikacji;
- raportuj wynik zgodnie z prawdą: jeśli coś nie przeszło albo nie dało się tego sprawdzić, napisz to wprost.

### Subagenci

- Szerokie przeszukiwanie kodu, research i niezależne podzadania zlecaj subagentom, żeby nie zaśmiecać głównego kontekstu. Od subagenta oczekuj wniosków, nie zrzutów plików.
