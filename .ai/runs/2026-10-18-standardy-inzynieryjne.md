# Wdrożenie standardów inżynieryjnych

- **Spec:** `.ai/specs/2026-10-18-standardy-inzynieryjne.md`
- **Źródło:** `.ai/docs/engineering-standards.md`
- **Gałąź:** `feat/engineering-standards`

## Plan

1. Kierunek zależności: `db` bez `core`; `initOrm()` w `db`; `core` dostaje `env`, `logger`, `container/{container,cradle}` z `withScope`, serwis health; `app/lib/container.ts` znika.
2. Warstwa `core/src/http` (errors, apiHandler + CSRF, makeCrudRoute, auth fail-closed) + testy.
3. Koncepcja wzorcowa `mentors/technology`: `base.entity`, encja, migracja + słownik, walidator, serwis, rejestracja w kontenerze, testy.
4. `ui`: shadcn → `components/ui/`, `backend/{api,forms,tables,feedback}`.
5. `app`: grupy `(marketing)`, `(admin)`; `/api/health`, `/api/technologies`; strony `/admin`, `/admin/technologies`.
6. ESLint granice + zakaz `fetch`; weryfikacja (lint, typecheck, test, build bez bazy, dev + zrzuty, audit); dokumentacja; commit + PR.

## Przebieg

### Krok 0
- `.ai/docs/engineering-standards.md` zapisany z `~/Downloads` (pobranie z URL → 401, wymaga logowania).
- Kolizje ze standardem zgłoszone człowiekowi; decyzje 1–4 w spec. Gałąź `feat/engineering-standards`.

### Krok 1–3 — kierunek zależności, warstwa http, koncepcja wzorcowa
- `db` nie zależy od `core`. `getOrm()` zastąpione `initOrm(url)`; singleton trzyma kontener w `core`. `db` re-eksportuje typy ORM i wyjątki (tylko `db` importuje `@mikro-orm/*`).
- `db/src/constants.ts` (limity kolumn) jako osobny eksport `@devmentor/db/constants` bez importów ORM — używany przez walidatory, które trafiają do bundla przeglądarki.
- `base.entity.ts` jako `baseProperties` (UUID przez `randomUUID`, `createdAt`, `updatedAt`) rozsmarowywane w `defineEntity` — prościej niż dziedziczenie schematów.
- Encja `mentors/technology.entity.ts` (tabela `technologies`, unikalne `name`/`slug`). Migracje: `Migration20261018084723_technologies` (wygenerowana z diffu), `Migration20261018084733_seed_technologies` (8 technologii; `addSql` w MikroORM 7 nie przyjmuje parametrów → stałe literały). Sprawdzone up/down/up.
- `core`: `config/env.ts` (Zod, leniwe `parseEnv`, błąd bez wartości), `logger.ts` (pino + redakcja), `http/{errors,api-handler,auth,make-crud-route}.ts`, `container/{container,cradle}.ts` z `withScope`, `services/health`, `services/mentors/technology.service.ts` (DTO, konflikt przez constraint bazy, nie check-then-write), `validators/mentors/technology-{create,update}.schema.ts`. Eksport `@devmentor/core/validators/*` dla klienta.
- Testy core: kontener, env, logger (redakcja), schematy (w tym brak mass assignment), apiHandler (koperta, CSRF, 400/404/409/500 bez wycieku), makeCrudRoute (fail closed, tylko sparsowane dane, `?id=`), TechnologyService integracyjnie (w tym równoczesne wstawienie tego samego sluga → dokładnie jeden sukces + ConflictError).

### Krok 4–5 — ui i app
- shadcn: `git mv` do `components/ui/`, alias `ui` w `components.json`; `input`, `label`, `table`, `textarea` dodane przez CLI.
- `ui/src/backend`: `api/{types,api-call}.ts` (jedyny `fetch`, nagłówek `x-devmentor-request`, `readJsonSafe`, walidacja kształtu koperty, tylko `/api/*`), `feedback/*`, `tables/data-table.tsx` (bez zależności), `forms/crud-form.tsx` (Zod, `fieldErrors` z serwera, Cmd/Ctrl+Enter, Escape). Test `apiCall` (6).
- `app`: `(panel)` → `(admin)`; strona główna → `(marketing)/page.tsx` (`HomePage`); `api/health` (apiHandler), `api/technologies` (makeCrudRoute, odczyt publiczny, zapis fail closed); `/admin` (karta stanu bazy przez `apiCall`), `/admin/technologies` (`DataTable` + `CrudForm` z tą samą schemą). `app` nie zależy już od `db` ani `server-only`; `app/lib/container.ts` usunięty.
- Problem: typecheck `app` padał na nieaktualnych `.next/dev/types` (stare trasy `(panel)`), których `next typegen` nie odświeża → `rm -rf packages/app/.next`.
- Build przy niedostępnej bazie: OK, strony ○, API ƒ (dynamiczne bez `export const dynamic`). Start bez bazy: strony 200, `/api/health` → `{ ok: true, data: { ok: false } }`.
- Problem: `/api/technologies` bez bazy → 500 zamiast 503. MikroORM 7 łączy się leniwie, a błąd to `DriverException` z kodem `ECONNREFUSED` (nie `ConnectionException`). Dodane `isDatabaseUnavailableError` w `db` (ConnectionException, kody sieciowe, SQLSTATE 08) i mapowanie na `ServiceUnavailableError` (503) w `apiHandler`. Testy w `db` i `core`. Razem 35 testów.

### Krok 6 — ESLint, weryfikacja, dokumentacja
- ESLint: `no-restricted-imports` per pakiet (kierunek zależności, `@mikro-orm/*` tylko w `db`, `next`/`react` poza `core`/`db`, zakaz importu `src/` innych pakietów), `no-restricted-globals`/`no-restricted-properties` dla `fetch` w `app` i `ui` poza `api-call.ts`. Sprawdzone plikami-sondami: 9/9 naruszeń wykrytych.
- Produkcja z bazą: `/api/health` 200 z wersją; `GET /api/technologies` → 8 rekordów; `POST` bez nagłówka → 403; `POST`/`PUT`/`DELETE` z nagłówkiem bez sesji → 401; w bazie nadal 8 rekordów.
- Problem (narzędziowy): pierwsza seria curl dała 400 z pustym body — zsh nie dzielił `$H` na argumenty. Po poprawce wyniki jak wyżej.
- UI przez CDP (skrypt w scratchpadzie, bez nowych zależności): przycisk „Odśwież” aktywny po załadowaniu; puste pola i zły slug → komunikaty z tej samej schemy; Ctrl+Enter wysyła; 401 pokazany w `CrudForm` i przy „Usuń”. Zrzuty OK.
- `npm audit`: tylko 6 zaakceptowanych alertów `braces`; `zod`/`pino` bez nowych.
- AGENTS.md: sekcja architektury przepisana według standardów (po polsku), `.ai/docs/` dodany do struktury `.ai/`, krok „przeczytaj standardy” przed większą zmianą, `npm audit` w weryfikacji. README: diagram, warstwy, DI, struktura. Lessons: 5 nowych wpisów.
- Spec: kryteria odhaczone, uwagi z wdrożenia, przeniesiona do `.ai/specs/implemented/`.

## Wynik

**Działa:** lint (z granicami pakietów), typecheck, 35 testów w 10 plikach (core, db, ui; integracyjne na PostgreSQL), build z bazą i bez niej, start bez bazy (strony 200, API 503 w kopercie), API i UI zgodnie z kryteriami.

**Nie zrobione (poza zakresem):** auth (zapisy w `/admin/technologies` zwracają 401 do czasu wdrożenia), eventy, porty płatności, testy komponentów React (brak jsdom/Testing Library — sprawdzone w przeglądarce).

**Do decyzji człowieka:** termin wdrożenia auth.
