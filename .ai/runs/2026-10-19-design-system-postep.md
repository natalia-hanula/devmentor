# POSTĘP — design system DevMentor (`packages/ui`)

> Plik przeniesiony 2026-10-27 z `packages/ui/POSTEP.md` (zadanie 4.9 runu `2026-10-20-e01-etap-a.md`, decyzja 24): logi przebiegów AI trzymamy w `.ai/runs/` (`AGENTS.md`); treść bez zmian.

Prompt: `lekcja-06/cwiczenie-3-gotowy-prompt.txt` (etapy 0–5, stop po każdym etapie). Specyfikacja: `.ai/specs/2026-10-19-design-system-storybook.md`. Materiały: `lekcja-06/referencje.md`, `lekcja-06/tokeny.md`, `.ai/specs/product-brief.md`, `.ai/specs/research/`, `.ai/specs/backlog.md`, `.ai/specs/2026-10-18-e01-konta-i-role.md`, `.ai/specs/2026-10-18-platform-primitives.md`. Gałąź: `lekcja-06-design-system` (zmiany etapu 1 niezacommitowane).

## Etapy

| Etap | Stan | Data |
|---|---|---|
| 0. Inwentaryzacja i plan | zakończony, plan zatwierdzony | 2026-10-19 |
| 1. Fundamenty | zakończony; P1–P10 zatwierdzone | 2026-10-19 |
| 2. Komponenty bazowe | nie rozpoczęty | — |
| 3. Komponenty produktu, wzorce, ekrany (E01 + Platform) | nie rozpoczęty | — |
| 4. Strony, które uczą | nie rozpoczęty | — |
| 5. Sprawdzenie i raport | nie rozpoczęty | — |

## Zatwierdzone decyzje

| # | Decyzja | Kto, kiedy |
|---|---|---|
| — | Referencje R01, R02, W01–W05, AR01–AR08, K1–K5 i tokeny T1–T7 | Natalia, 2026-10-19 (ćwiczenie 2) |
| Q1 | Interfejs po polsku (specyfikacje są źródłem prawdy), dokumentacja po angielsku | Natalia, 2026-10-19 |
| Q2 | `POSTEP.md` w `packages/ui` + krótka specyfikacja w `.ai/specs/` | Natalia, 2026-10-19 |
| Q3 | Etap 3 tylko E01 i Platform; E02–E05 do „What is missing” | Natalia, 2026-10-19 |
| Q4 | Brakujące elementy jako oznaczone propozycje; `Calendar` poza planem, wybór daty do „What is missing” | Natalia, 2026-10-19 |
| Q5 | Testy jsdom dla każdego nowego prymitywu (100% pokrycia), Playwright Chromium, nowe joby CI, toast przez `sonner` bez `next-themes` | Natalia, 2026-10-19 |
| C1 | Wartości tokenów z `tokeny.md` zamiast shadcn (nazwy zostają), nowy `tokens.css` | Natalia, 2026-10-19 |
| C2 | Geist usunięty z `packages/app/app/layout.tsx`, IBM Plex z `@fontsource` w `ui` | Natalia, 2026-10-19 |
| C3 | `ring-ring/50` → `ring-ring` w button/input/textarea/badge | Natalia, 2026-10-19 |

## Etap 1 — co powstało

- **Tokeny** `src/styles/tokens.css`: warstwa surowa (`--raw-*`), znaczeniowa (nazwy shadcn + `--font-family-*`, `--type-*`, `--space-*`, `--measure-text`, `--layout-*`, `--radius`, `--motion-short`, `--ease-standard`), komponentów (`--list-row-py`, `--list-row-gap`). Źródło przy każdym tokenie znaczeniowym. Motyw jasny na `:root` / `.light`, ciemny na `.dark`. Kontrast przeliczony z zapisanego pliku: wszystkie pary powyżej progu (jak w `tokeny.md`).
- **Tailwind** `src/styles/globals.css`: `@theme inline` mapuje tokeny na klasy (`bg-primary`, `text-page-title`, `text-meta`, `gap-in-group`, `p-panel`, `max-w-measure`, `font-code` …); domyślne przejście = `--motion-short`; `prefers-reduced-motion` wyłącza ruch; wariant `dark:` respektuje `.light` wewnątrz `.dark`. Fonty IBM Plex Sans 400/500/600 i Mono 400/500 z `@fontsource` (z latin-ext).
- **Storybook 10.6.2** (`@storybook/react-vite`) w `.storybook/`: docs + `remark-gfm`, a11y z `test: 'error'`, `@storybook/addon-vitest`; przełącznik motywu w toolbarze ustawia `class="dark"` i `data-theme` na `<html>` (także dla stron MDX, przez kanał globals); viewporty 320/768/1440; tylko marka DevMentor (tytuł karty, ukryty h1, favicon), checklista startowa, „What's new” i telemetria wyłączone; docs krojem IBM Plex.
- **Testy stories**: `vitest.storybook.config.ts` — dwa projekty (`storybook-light`, `storybook-dark`) w Chromium; poza `npm test`.
- **Strony Foundations** (`stories/foundations/`): Color (role + kontrast mierzony w przeglądarce w obu motywach), Typography (role ze zmierzonymi wartościami), Spacing and layout, Shape and depth, Motion, Icons, Themes (+ `themes.stories.tsx` z prawdziwymi komponentami). Bloki pomocnicze w `.storybook/blocks/` (bez eksportu z pakietu), podglądy w `<Unstyled>`.
- **`lint:tokens`** (`scripts/check-tokens.mjs`): kolory spoza `tokens.css`, klasy palety Tailwinda, wartości arbitralne (warianty `data-[…]:` dozwolone; w MDX pomija kod w backtickach). Kończy się błędem.
- **Skrypty**: `storybook`, `build-storybook`, `test:storybook`, `lint:tokens` w `packages/ui` i jako delegacje w głównym `package.json`. **CI**: nowy job `storybook` (build + testy stories). `lint:tokens` w CI dopiero w etapie 2.
- Inne: `.gitignore` i ESLint ignorują `storybook-static/`; `tsconfig` pakietu obejmuje `stories`, `.storybook`; dwa wpisy w `.ai/lessons.md`.

## Etap 1 — sprawdzone

| Co | Wynik |
|---|---|
| `npm run build-storybook` | przechodzi (ostrzeżenia Vite o `"use client"` z Radix — bez wpływu) |
| `npm run test:storybook` | 4/4 (2 stories × 2 motywy). Sonda: story z przyciskiem bez nazwy kończy się błędem `button-name` w obu motywach; projekt dark ma `html.dark` i ciemne `--primary`. Raz po przebudowie zbieranie testów padło, 5 kolejnych uruchomień (także z zimnym cache) przeszło — do obserwacji |
| `npm run lint`, `npm run typecheck` | przechodzą |
| `npm test` | 33 pliki, 186 testów, pokrycie 100% |
| `npm run build` (Next) | przechodzi, fonty IBM Plex w CSS aplikacji |
| `npm run lint:tokens` | **13 znalezisk, wszystkie w istniejących prymitywach shadcn** (zob. niżej) — do poprawy w etapie 2 |
| Przeglądarka (zbudowany Storybook, 1440 px) | 7 stron Foundations bez błędów; tabele MDX renderują się (bez surowych `|`); kontrast zmierzony: jedyne FAIL to celowy wiersz referencyjny `ring/50` (light 2,19); tytuł karty i ukryty h1 = DevMentor; brak checklisty |
| Niesprawdzone | 320 i 768 px na stronach Foundations; obsługa klawiaturą; strony docs w motywie ciemnym mają jasne tło dokumentacji (podglądy są ciemne) |

Znaleziska `lint:tokens` (etap 2): `transition-[color,box-shadow]` (badge, input, textarea), `focus-visible:ring-[3px]` (badge, button, input, textarea), `text-white` (badge, button — wariant destructive), `grid-rows-[auto_auto]`, `grid-cols-[1fr_auto]` (card), `translate-y-[2px]` (table).

## Decyzje z etapu 1 (P1–P10, zatwierdzone przez Natalię 2026-10-19)

| # | Decyzja | Gdzie zapisane | Wdrożenie |
|---|---|---|---|
| P1 | Role typograficzne: page title 24/32/600, section title 18/28/600, body 14/20, body public 16/24, label 14/20/500, code 13/20 (row title i meta z Z4) | `tokens.css`, Foundations/Typography | wdrożone |
| P2 | Maks. szerokość treści: panel 72rem, strona mentora 48rem | `tokens.css`, Foundations/Spacing and layout | wdrożone |
| P3 | Margines strony przy 320 px: 16 px (`px-4`) | Foundations/Spacing and layout | zasada |
| P4 | Ikona samodzielna 20 px (`size-5`) | Foundations/Icons | zasada |
| P5 | Mały cień tylko dla nakładek (dialog, menu, popover) | Foundations/Shape and depth | wartość w etapie 2 |
| P6 | Pełne zaokrąglenie tylko dla awatarów i znaczników statusu | Foundations/Shape and depth | zasada (etap 2) |
| P7 | Link zewnętrzny: ikona `ExternalLink` + informacja dla czytnika, gdy otwiera nową kartę | Foundations/Icons | zasada |
| P8 | Jeden zestaw ikon (lucide) | Foundations/Icons | zasada |
| P9 | `--destructive-foreground` (L warm-gray-99, D warm-gray-17) zamiast `text-white`; w ciemnym motywie pełne `destructive` zamiast `/60` | Foundations/Color | token + kontrast w etapie 2 |
| P10 | `<html lang="en">` w aplikacji przy polskim interfejsie (WCAG 3.1.1) — poza katalogiem DS | tutaj | do strony „What is missing” (etap 4) |

## Otwarte pytania (przed partią 1 etapu 2)

- Kształt i gęstość kontrolek: wysokość (shadcn: 36 px), promień (dziś domyślne 10 px — zasada 2 wymaga decyzji), padding, grubość i odstęp pierścienia fokusu (dziś 3 px, wartość arbitralna).

## Notatka techniczna

- Baza komponentów: shadcn/ui (styl `new-york`, `components.json`) na prymitywach Radix (`radix-ui`), ikony lucide. W interfejsie Storybooka nazwa bazy nie występuje.
- Storybook nie importuje Next.js: `@storybook/react-vite`, Tailwind przez `@tailwindcss/vite` w `viteFinal`, style podglądu `.storybook/preview.css` (importuje `globals.css` + `@source` stories i bloków).
- DS01 (typy `email`/`password` + `autoComplete` w `CrudForm`) wdrożone 2026-10-20 przed formularzami E01 (gałąź `lekcja-08-e01-etap-a`, zadanie 0.4); dokumentacja w etapie 2.
- Lokalnie testy stories wymagają `npx playwright install chromium` (przeglądarka w `~/Library/Caches/ms-playwright`, poza repo).

## Następny krok

Etap 2 **nie jest rozpoczęty** — czeka na „dalej” od Natalii. Pierwszy krok etapu 2: lista różnic kształtu, gęstości i stanów od shadcn (wysokość kontrolek, promień, padding, fokus) z pytaniami tam, gdzie materiały milczą; potem partia 1 (ok. 6 prymitywów).
