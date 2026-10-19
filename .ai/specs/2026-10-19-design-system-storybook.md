# Design system DevMentor ze Storybookiem w `packages/ui`

- **Status:** zaakceptowana 2026-10-19 przez Natalię (etap 0 ćwiczenia 3, lekcja 06). Postęp etapów: `packages/ui/POSTEP.md`.
- **Wsad:** `lekcja-06/cwiczenie-3-gotowy-prompt.txt`, `lekcja-06/referencje.md`, `lekcja-06/tokeny.md`, `.ai/specs/product-brief.md`, `.ai/specs/backlog.md`, `.ai/specs/2026-10-18-e01-konta-i-role.md`, `.ai/specs/2026-10-18-platform-primitives.md`.

## Cel

Developer albo agent buduje nowy ekran DevMentora z dokumentacji w Storybooku bez zgadywania. Dokumentacja mówi, którego komponentu użyć i dlaczego, jakich tokenów, jak zachowa się każdy stan i czego unikać.

## Zakres

### Wchodzi

- Tokeny w trzech warstwach (`packages/ui/src/styles/tokens.css`) z `lekcja-06/tokeny.md`, w jasnym i ciemnym motywie. Wartości shadcn zastąpione, nazwy zostają (C1).
- Fonty IBM Plex Sans i Mono z `@fontsource` w `ui`. Geist usunięty z `packages/app/app/layout.tsx` (C2).
- Pierścień fokusu w pełnym kolorze w prymitywach (C3).
- Storybook 10 (`@storybook/react-vite`) w `packages/ui/.storybook`, stories i MDX w `packages/ui/stories/`. Dodatki: docs + `remark-gfm`, a11y (`test: 'error'`), vitest (stories jako testy w Chromium, oba motywy), MSW (od etapu 3).
- Skrypt `lint:tokens` i joby CI dla Storybooka.
- Prymitywy z minimalnego zestawu promptu, każdy z 13-sekcyjną stroną i macierzą stanów.
- Komponenty produktu, wzorce i ekrany dla **E01 i platform primitives** (Q3).
- Strony uczące (Start here, How to choose, What to avoid …) i skrót dla agentów `docs/design-system.md` z odwołaniem w `AGENTS.md`.

### Nie wchodzi

- Komponenty i ekrany E02–E05 — wpisane do „What is missing” (Q3).
- `Calendar` i wybór daty terminu — do „What is missing” (Q4).
- Zmiany w kodzie aplikacji poza fontami w `layout.tsx` i podłączeniem skryptów oraz konfiguracji.

## Wymagania

1. Interfejs po polsku, dokumentacja po angielsku (Q1). Teksty interfejsu ze specyfikacji; brakujące teksty jako oznaczone propozycje (Q4).
2. Każda wartość w komponentach z tokenu: bez kolorów poza `tokens.css`, klas palety Tailwinda i wartości arbitralnych (`lint:tokens` kończy się błędem).
3. Każda reguła w dokumentacji ma źródło (R…, AR…, W…, Z…, D…, WCAG, WAI-ARIA) albo jest oznaczona jako propozycja.
4. Stories renderują prawdziwe komponenty z pakietu.
5. Motyw ustawiany na `<html>` (klasa `dark`, `data-theme`).
6. Reguła 100% pokrycia z `AGENTS.md`: każdy nowy plik w `packages/ui/src/**` ma testy jednostkowe jsdom w `npm test`. Testy stories nie liczą się do pokrycia (Q5).
7. Zależności tylko z planu: Storybook i dodatki, `@vitest/browser-playwright`, `playwright`, `msw`, `msw-storybook-addon`, `@tailwindcss/vite`, `remark-gfm`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `sonner` (toast bez `next-themes`), prymitywy przez shadcn CLI.

## Kryteria akceptacji

- [ ] `npm run build-storybook` i `npm run test:storybook` (oba motywy) przechodzą; a11y bez naruszeń albo z opisanym wyjątkiem.
- [ ] `npm run lint:tokens` nie znajduje żadnej wartości spoza tokenów w `packages/ui`.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` (100%) i `npm run build` przechodzą.
- [ ] Każdy komponent ma stronę z 13 sekcjami i macierz stanów; każdy wzorzec ma stany danych, formularz także stany odpowiedzi API.
- [ ] Każdy kluczowy ekran E01 i platform primitives ma story i mapę stanów.
- [ ] Test agentem przygotowany w `POSTEP.md` (wykonywany w nowej sesji).

## Otwarte pytania

- Kształt i gęstość prymitywów (wysokość kontrolek, promień — dziś domyślne 10 px shadcn): do rozstrzygnięcia przed partią 1 etapu 2.
- Typografia: role poza rozmiarami z `tokeny.md` (nagłówek sekcji, kod) i maksymalna szerokość treści — propozycje z etapu 1 do zatwierdzenia.
