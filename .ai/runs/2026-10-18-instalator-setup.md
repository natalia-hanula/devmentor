# Plan wykonania: instalator `npm run setup`

Source doc: .ai/specs/2026-10-18-instalator-setup.md
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

- [ ] 1.1 Szkielet i narzędzia
- [ ] 1.2 Kroki plikowe i wymagania (0–4)
- [ ] 1.3 Kroki bazodanowe (5–8)
- [ ] 1.4 Adapter systemowy i wejście
- [ ] 1.5 Test integracyjny
- [ ] 1.6 Dokumentacja
