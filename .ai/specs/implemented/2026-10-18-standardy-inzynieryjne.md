# Wdrożenie standardów inżynieryjnych

- **Status:** wdrożona 2026-10-18 (decyzje 1–4 podjęte przez człowieka; log: `.ai/runs/2026-10-18-standardy-inzynieryjne.md`)
- **Źródło:** `.ai/docs/engineering-standards.md` (2026-09-01, status: active)
- **Poprzednia specyfikacja:** `.ai/specs/implemented/2026-10-18-monorepo-architektura.md` — ta zmienia jej regułę kierunku zależności i grupy tras.

## Cel

Dostosować monorepo do standardów inżynieryjnych: konwencja folderów koncepcji, wspólne warstwy API (`core/src/http`) i UI (`ui/src/backend`), walidacja Zod, logger, kontener DI w `core`, wymuszenie granic pakietów w ESLint — oraz jedna koncepcja wzorcowa, którą kolejne koncepcje będą kopiować.

## Decyzje (2026-10-18)

1. **Kierunek zależności ze standardu:** `app → core → db`; `app → ui`; `ui` nie importuje pakietów wewnętrznych. Tylko `db` importuje `@mikro-orm/*`. Kontener i cradle przenoszone do `core/src/container/`.
2. **`cacheComponents` zostaje.** Reguła „DB tylko w `force-dynamic`” jest realizowana przez dostęp do bazy wyłącznie w czasie żądania (`connection()` / runtime API + `<Suspense>`); `export const dynamic` jest w Next 16 z Cache Components niedozwolony. Aplikacja musi się budować i startować bez bazy.
3. **Grupy tras per persona, bez `src/`:** `packages/app/app/(marketing)`, `(auth)`, `(student)`, `(mentor)` oraz `(admin)` dla panelu admina — każda tworzona dopiero przy pierwszej stronie. `(panel)` znika.
4. **Zakres:** warstwy + jedna koncepcja wzorcowa (`technologies` w folderze koncepcji `mentors`, zgodnie z drzewem w standardzie). Bez auth (bcrypt/JWT), bez eventów i portów płatności (YAGNI — powstaną z pierwszą potrzebującą ich funkcją).

## Adaptacje standardu (bez zmiany intencji)

- Nazwy plików w kebab-case (`api-handler.ts`, `crud-form.tsx`), jak reszta repo.
- Prymitywy shadcn w `ui/src/components/ui/`.
- `core` nie importuje `next` → `apiHandler`/`makeCrudRoute` operują na standardowych `Request`/`Response`.
- `auth.ts` bez koncepcji auth: `getSession` zawsze zwraca brak sesji → `requireSession` rzuca `UnauthorizedError` (fail closed). Zapisy w koncepcji wzorcowej są więc chronione i do czasu wdrożenia auth zwracają 401.
- Ochrona CSRF w `apiHandler`: metody zmieniające stan wymagają nagłówka ustawianego przez `apiCall`.
- `DataTable` bez zewnętrznej biblioteki (prosta konfiguracja kolumn + paginacja po stronie klienta), zgodnie z zasadą „nie dodawaj zależności na 20 linii kodu”.
- `DatabaseHealthService` przenoszony do `core/src/services/health/` — wyjątek od reguły „serwis ⇔ encja” (infrastruktura, nie domena).
- Punkt o `docs/product-scope.md` pominięty (pliku nie ma w repo). Sekcja 5 standardu (migracja `user.entity` itd.) nie dotyczy tego repo.

## Zakres

### Wchodzi

- `core`: `config/env.ts` (Zod), `logger.ts` (pino z redakcją sekretów), `container/{container,cradle}.ts` z `withScope`, `http/{errors,api-handler,make-crud-route,auth}.ts`, `services/health/`, `services/mentors/technology.service.ts`, `validators/mentors/`.
- `db`: `entities/base.entity.ts` (UUID, `createdAt`, `updatedAt`), `entities/mentors/technology.entity.ts`, `initOrm()`, migracja tabeli `technologies` + słownik startowy technologii.
- `ui`: `components/ui/` (shadcn: button, card, badge, input, label, table), `backend/api/{api-call,types}.ts`, `backend/forms/crud-form.tsx`, `backend/tables/data-table.tsx`, `backend/feedback/*`.
- `app`: `api/health/route.ts` (apiHandler), `api/technologies/route.ts` (makeCrudRoute), `(marketing)/page.tsx`, `(admin)/admin/page.tsx` (stan bazy przez `apiCall`), `(admin)/admin/technologies/page.tsx` (`DataTable` + `CrudForm`).
- ESLint: `no-restricted-imports` dla granic pakietów i `@mikro-orm/*`, zakaz surowego `fetch` w `app`/`ui` poza `api-call.ts`.
- Testy: warstwa http, walidatory, `TechnologyService` (integracyjnie), `apiCall`.
- AGENTS.md (sekcje ze standardu, po polsku), README, lessons.

### Nie wchodzi

- Auth (User, bcrypt, JWT, cookies, rate limiting), eventy, porty/adaptery płatności, pozostałe koncepcje.
- Testy komponentów React (wymagałyby jsdom + Testing Library) — komponenty sprawdzane w działającej aplikacji.

## Kryteria akceptacji

- [x] Kierunek zależności wymuszony przez ESLint; naruszenie (np. import `@devmentor/core` w `ui`) kończy się błędem lintu.
- [x] `GET /api/technologies` zwraca `{ ok: true, data: [...] }`; zapis bez sesji → 401 w kopercie `{ ok: false, error }`; zapis bez nagłówka CSRF → 403; błędne dane → 400 z `fieldErrors` (przez trasę osiągalne dopiero z sesją — sprawdzone testem `makeCrudRoute` z dopuszczonym zapisem).
- [x] `GET /api/health` przez `apiHandler`; `/admin` pokazuje stan bazy przez `apiCall` i komponenty `feedback`.
- [x] `/admin/technologies` renderuje listę przez `DataTable` i formularz przez `CrudForm` (ta sama schema Zod co w API).
- [x] `npm run build` przechodzi przy niedostępnej bazie; aplikacja startuje, a `/admin` pokazuje błąd zamiast się wywracać.
- [x] Logger redaguje hasła, tokeny i nagłówki autoryzacji (test).
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit` (bez nowych alertów poza zaakceptowanymi `braces`).
- [x] AGENTS.md i README opisują nowy układ.

## Otwarte pytania

- Kiedy wdrażamy auth — od tego zależy odblokowanie zapisów w `/admin/technologies`.

## Uwagi z wdrożenia

- Dodatkowo (poza pierwotną listą): `ServiceUnavailableError` (503) i `isDatabaseUnavailableError` w `db` — MikroORM 7 łączy się leniwie, więc bez tego niedostępna baza dawała ogólne 500.
- Kolejność sprawdzeń w trasie: CSRF → autoryzacja → walidacja danych → serwis.
- UI sprawdzone w przeglądarce (headless Chrome przez CDP): walidacja klienta, Ctrl+Enter, błąd 401 z serwera w `CrudForm` i przy usuwaniu, lista z `DataTable`.
