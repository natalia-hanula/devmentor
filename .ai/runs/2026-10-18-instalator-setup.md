# Plan wykonania: instalator `npm run setup`

Source doc: .ai/specs/implemented/2026-10-18-instalator-setup.md
Issue: #5 · Spec PR: #6 (zmergowany)

## Cel

Komenda `npm run setup` (`scripts/setup.ts`) wykonuje kroki z README → „Uruchomienie lokalne”, idempotentnie, zgodnie ze specem (decyzje 1–4 z #5, A1–A9 zatwierdzone w #6).

## Zakres

- `scripts/setup.ts`, `scripts/setup/**`, `scripts/test/**`, `scripts/tsconfig.json`, `scripts/vitest.config.ts`.
- `vitest.config.ts` (projekt `scripts`, zakres pokrycia), `package.json` (skrypt `setup`, `typecheck`, `pg` + `@types/pg`).
- `tests/integration/setup-databases.int.test.ts`.
- `README.md`, `AGENTS.md` (zakres pokrycia + wyjątek A9).

**Poza zakresem:** instalacja Node/Dockera/Homebrew/PostgreSQL, tworzenie ról, start serwera, Windows, zmiany w pakietach `packages/*`.

## Plan

Kroki odpowiadają „Implementation Plan” w specu.

## Ryzyka

- Type stripping w Node: importy z `.ts` i `import type` (`verbatimModuleSyntax`) — sprawdzane uruchomieniem `node --experimental-strip-types`.
- Testy integracyjne lokalnie wymagają Dockera albo `INTEGRATION_DATABASE_URL`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Instalator

- [x] 1.1 Szkielet i narzędzia — 0e11085
- [x] 1.2 Kroki plikowe i wymagania (0–4) — e072d95
- [x] 1.3 Kroki bazodanowe (5–8) — 23cb1c1
- [x] 1.4 Adapter systemowy i wejście — a31546e
- [x] 1.5 Test integracyjny — 4ce04c0
- [x] 1.6 Dokumentacja — 85cd2f9

## Dziennik

- 1.1–1.4: `node --experimental-strip-types` działa z `allowImportingTsExtensions` + `verbatimModuleSyntax` (osobny `scripts/tsconfig.json`; główny `tsconfig.json` dostał tylko `allowImportingTsExtensions`, bo test integracyjny importuje kod z `scripts/`). Smoke test w worktree na lokalnym PostgreSQL: 1. przebieg tworzy `.env` i symlink, 2. przebieg pomija `.env`, symlink i bazy; `npm install` i migracje bez zmian. `npm test`: 100% (550/550 instrukcji, wcześniej 383).
- 1.5: Docker niedostępny lokalnie → `npm run test:integration` z `INTEGRATION_DATABASE_URL` na `devmentor_integration`: 4 pliki / 11 testów zielone. Wariant testcontainers sprawdza CI.
- 1.6: README (szybka ścieżka + „Ręcznie”), `AGENTS.md` (zakres pokrycia, wyjątek A9). Spec przeniesiony do `implemented/`. Weryfikacja na żywo: drugi przebieg nie zmienia `.env` (sha bez zmian); zły port → kod 1 + instrukcja; zła rola → osobny komunikat; `next dev` po instalatorze → `/api/health` `ok: true`.
