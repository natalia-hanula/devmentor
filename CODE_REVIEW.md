# Code review — DevMentor

Reguły review tego repozytorium. Stosuje je człowiek i skill `om-code-review` (a przez niego `om-auto-review-pr`). Uzupełniają — nie zastępują — checklistę z `.ai/docs/engineering-standards.md` → „Code Review Checklist” (podpiętą w `.ai/agentic.config.json` jako `reviewChecklist`) oraz reguły z `AGENTS.md`. W razie sprzeczności obowiązuje `AGENTS.md`.

## Priorytety

1. **Poprawność** — zachowanie zgodne ze specyfikacją z `.ai/specs/` i jej kryteriami akceptacji.
2. **Bezpieczeństwo** — auth po stronie serwera, własność rekordu, fail closed, brak mass assignment, brak sekretów w logach i odpowiedziach.
3. **Kontrakty** — zmiany powierzchni z `BACKWARD_COMPATIBILITY.md` (koperta API, trasy, schemat bazy, zmienne środowiskowe, eksporty pakietów).
4. **Testy** — 100% pokrycia na plik i asercje zachowania, nie tylko wywołanie kodu.
5. **Konwencje i czytelność** — dopiero po powyższych.

## Kontrole specyficzne dla repo

### Granice pakietów
- Kierunek `app → core → db` i `app → ui`; `ui` i `db` nie importują pakietów wewnętrznych, `core` nie importuje Next.js ani Reacta. Reguły `no-restricted-imports` w `eslint.config.mjs` nie są luzowane.
- `app` nie importuje `@devmentor/db`; tylko `db` importuje `@mikro-orm/*` (w `core` są re-eksporty).
- Kod kliencki importuje z `core` wyłącznie `@devmentor/core/validators/*`. Walidatory importują tylko `zod` i `@devmentor/db/constants`.
- Importy między pakietami przez nazwę (`@devmentor/core`), nigdy przez ścieżkę do `src/`.
- Nowy pakiet `@mikro-orm/*` trafia do `serverExternalPackages` w `packages/app/next.config.ts`, nigdy do `transpilePackages`.

### Warstwa API (`packages/core/src/http/`)
- Każda trasa jest opakowana w `apiHandler()` albo zbudowana przez `makeCrudRoute()` — bez własnego `try/catch` i `NextResponse.json`.
- Wejście jest walidowane schemą Zod przez `parseJsonBody()` / `parseInput()`; do serwisu trafia tylko sparsowany kształt.
- Serwisy rzucają wyłącznie błędy z hierarchii `AppError` (`errors.ts`) i nie budują odpowiedzi HTTP.
- Dostęp w `makeCrudRoute` domyślnie wymaga sesji; `"public"` musi być wpisane jawnie i uzasadnione.
- Chroniona trasa sprawdza własność konkretnego rekordu (`assertOwnership`), nie tylko obecność sesji.

### Dane i baza (MikroORM 7)
- Encja przez `defineEntity` z `...baseProperties`, ID jako UUID, tabela snake_case w liczbie mnogiej.
- Każda zmiana schematu ma migrację i zaktualizowany `.snapshot-*.json` w tym samym PR-ze; bez `schema:update`.
- Niezmienniki współdzielonego stanu pilnuje constraint i/lub transakcja — nie check-then-write.
- Brak SQL sklejanego z danymi użytkownika; dane w migracjach jako literały.
- Server Component czytający bazę jest w `<Suspense>` i zaczyna od `await connection()`; brak `export const dynamic`. Build przechodzi bez bazy i bez `.env`.

### DI, konfiguracja, logi
- Serwisy są pobierane wyłącznie przez `withScope((cradle) => …)`; nowy serwis ma wpis w `registerRequestDependencies` i pole w `RequestCradle`.
- Nowa zmienna środowiskowa jest w schemie `core/src/config/env.ts` i w `.env.example`; `parseEnv()` nie jest wywoływane na poziomie modułu.
- Logowanie przez `getLogger()` / `logger` z cradle; zero `console.log`. Nowe pole z sekretem trafia do `LOG_REDACT_PATHS`.

### UI
- `fetch()` do `/api/*` tylko w `ui/src/backend/api/api-call.ts`; strony używają `apiCall`, list `DataTable`, formularzy `CrudForm` i stanów `feedback/*`.
- Prymitywy shadcn dodane przez `npx shadcn@latest add`, nie ręcznie. Komponent jest umieszczony zgodnie z regułą „gdzie trafia nowy komponent” z `AGENTS.md`.
- `"use client"` tylko tam, gdzie potrzebna jest interaktywność.

### Testy
- Zakres pokrycia w `vitest.config.ts` nie jest rozszerzany o wyłączenia, progi nie są obniżane, brak `v8 ignore` / `istanbul ignore` bez zgody człowieka.
- Zmiana zachowania ma test, który nie przechodzi na starym kodzie; poprawka błędu ma test regresji.
- Przepływ przez bazę, kilka warstw lub przeglądarkę ma test integracyjny w `tests/integration/`; przepływy wrażliwe na wyścigi (rezerwacje) mają test przypadku równoczesnego.

### Proces
- Diff wynika w całości z celu PR-a — bez przypadkowych zmian nazw i formatowania.
- Nowa funkcja ma specyfikację w `.ai/specs/`; po pełnym wdrożeniu plik jest przeniesiony do `.ai/specs/implemented/` przez `git mv`.
- Autonomiczny przebieg ma log w `.ai/runs/`; nieoczywiste wnioski trafiają do `.ai/lessons.md`.
- Brak funkcji „na zapas” i martwego kodu; brak `any`; brak pustych `catch`; brak magicznych liczb.

## Bramka walidacji

`npm run lint`, `npm run typecheck`, `npm test` (100% pokrycia), `npm run build` — w tej kolejności, zgodnie z `.ai/agentic.config.json`. Testy integracyjne (`npm run test:integration`) uruchamia CI w zadaniu `integration`. Branch protection na `main` jest wyłączone celowo, więc czerwone CI to blocker w review, nawet gdy GitHub pozwala zmergować.

## Waga ustaleń

- **blocker** — luka bezpieczeństwa (brak auth lub sprawdzenia własności, mass assignment, sekret w logu, fail open), utrata danych, migracja bez snapshotu lub niezgodna ze schematem, złamanie granicy pakietów, pokrycie poniżej 100%, czerwone CI, łamiąca zmiana kontraktu bez ścieżki z `BACKWARD_COMPATIBILITY.md`.
- **major** — błąd poprawności w przepływie, brak testu regresji lub testu integracyjnego tam, gdzie jest wymagany, obejście wspólnej warstwy (`apiHandler`, `CrudForm`, `DataTable`, `apiCall`) bez uzasadnienia, `console.log` w kodzie produkcyjnym.
- **minor** — nazewnictwo niezgodne z tabelą w standardach, zbędny komentarz, drobne uproszczenia.
- **nit** — styl bez wpływu na zachowanie; nie blokuje merge'a.

Blocker i major oznaczają `changes-requested`. Minory i nity mogą trafić do issue follow-up (`om-followup-issue-from-pr`).
