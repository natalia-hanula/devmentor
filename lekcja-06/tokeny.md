# Tokeny: DevMentor

- Data: 2026-10-19
- Źródło decyzji: `lekcja-06/referencje.md` (R01, R02, W01–W05, AR01–AR08, K1–K5).
- Zatwierdziła: Natalia, 2026-10-19 (T1–T7). Kolor akcji #2D6870 wybrała Natalia; ciemny odpowiednik dobrał Claude na tym samym odcieniu.
- Istniejące tokeny: w repo nie ma `packages/ui/src/tokens.css`. Tokeny są w `packages/ui/src/styles/globals.css` (motyw shadcn „neutral” bez zmian, fonty Geist w `packages/app/app/layout.tsx`). Nazwy shadcn opisują przeznaczenie, więc decyzje są zmapowane na nie. Nowe nazwy dostały tylko fonty (`--font-sans`/`--font-mono` opisują wygląd), odstępy i ruch, bo nic istniejącego do nich nie pasuje.
- Motywy: jasny i ciemny. Ciemny jest zdefiniowany w CSS, ale dziś nic go nie włącza (klasa `.dark`). Decyzja Natalii (T3): zostaje, a jego wartości są utrzymywane.
- Stan: to dokument decyzji, w kodzie jeszcze nic nie jest zmienione.

## Tabela

L = jasny motyw, D = ciemny. Wartości surowe w oklch, w nawiasie hex.

| Token | Warstwa | Wartość | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|
| `--raw-warm-gray-99` | surowa | `oklch(0.997 0.002 80)` (#fffefd) | R01.4 | tylko w pliku tokenów | komponenty, strony |
| `--raw-warm-gray-98` | surowa | `oklch(0.985 0.004 80)` (#fbfaf7) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-96` | surowa | `oklch(0.960 0.006 80)` (#f4f1ed) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-95` | surowa | `oklch(0.950 0.007 80)` (#f1eee9) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-92` | surowa | `oklch(0.915 0.008 75)` (#e6e2dd) | R01.4, R01.3 | j.w. | j.w. |
| `--raw-warm-gray-72` | surowa | `oklch(0.720 0.010 70)` (#a9a49e) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-64` | surowa | `oklch(0.640 0.011 70)` (#918b85) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-52` | surowa | `oklch(0.520 0.010 65)` (#6d6863) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-50` | surowa | `oklch(0.500 0.011 65)` (#68625d) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-30` | surowa | `oklch(0.300 0.008 60)` (#312d2a) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-28` | surowa | `oklch(0.285 0.008 60)` (#2d2926) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-26` | surowa | `oklch(0.265 0.008 60)` (#282421) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-21` | surowa | `oklch(0.215 0.007 60)` (#1c1916) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-20` | surowa | `oklch(0.200 0.008 60)` (#191512) | R01.4 | j.w. | j.w. |
| `--raw-warm-gray-17` | surowa | `oklch(0.170 0.006 60)` (#110f0d) | R01.4 | j.w. | j.w. |
| `--raw-petrol-48` | surowa | `oklch(0.482 0.062 207.3)` (#2d6870) | W01, T1 (wybór Natalii) | j.w. | j.w. |
| `--raw-petrol-75` | surowa | `oklch(0.750 0.065 207.3)` (#7cbac3) | W01, T1 (ciemny odpowiednik, ten sam odcień) | j.w. | j.w. |
| `--raw-red-53` | surowa | `oklch(0.530 0.190 28)` (#c22823) | istniejące `destructive`, przyciemnione | j.w. | j.w. |
| `--raw-red-72` | surowa | `oklch(0.720 0.150 25)` (#f47b74) | istniejące `destructive` (D), złagodzone | j.w. | j.w. |
| `--spacing` (Tailwind) | surowa | `0.25rem`; dozwolone stopnie: 4, 8, 12, 16, 24, 32, 48 px | istniejący token Tailwind; skala z promptu | tylko te stopnie | wartości spoza skali (`px-[13px]`) |
| `--font-sans` | surowa | IBM Plex Sans (zamiast Geist) | W02, T2; AR01/P09 (domyślny font) | tylko przez `--font-ui` | bezpośrednio w komponentach |
| `--font-mono` | surowa | IBM Plex Mono (zamiast Geist Mono) | R01.2, W02, T2 | tylko przez `--font-code` | j.w. |
| `--background` | znaczeniowa | L `warm-gray-98` · D `warm-gray-17` | R01.4 | tło strony i panelu | tło kart i pól |
| `--card` / `--popover` | znaczeniowa | L `warm-gray-99` · D `warm-gray-21` | R01.4 | karta panelu, popover | wiersze listy (R01.3: bez kart) |
| `--muted` / `--secondary` | znaczeniowa | L `warm-gray-96` · D `warm-gray-26` | R01.4, R02.6 | nagłówek z opisem problemu w sesji, tło kodu inline, przycisk drugorzędny | tło całej strony |
| `--accent` *(w shadcn: tło najechania, nie kolor akcentu)* | znaczeniowa | L `warm-gray-95` · D `warm-gray-28` | R01.1 | najechanie na wiersz listy i przycisk ghost | wyróżnianie elementu głównego |
| `--foreground` (+ `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`) | znaczeniowa | L `warm-gray-20` · D `warm-gray-96` | R01.4 | tekst główny, tytuł wiersza, treść wiadomości | — |
| `--muted-foreground` | znaczeniowa | L `warm-gray-50` · D `warm-gray-72` | R01.5, R02.2 | metadane wiersza, autor i godzina wiadomości, placeholder | tytuły, treść wiadomości |
| `--primary` | znaczeniowa | L `petrol-48` · D `petrol-75` | W01, T1, R01.5 | CTA (jeden na ekran), stany aktywne, linki w tekście | dekoracje, tła sekcji, ikony bez akcji, kilka CTA naraz |
| `--primary-foreground` | znaczeniowa | L `warm-gray-99` · D `warm-gray-17` | W01 | tekst i ikona na `primary` | — |
| `--destructive` | znaczeniowa | L `red-53` · D `red-72` | istniejący (błąd, odwołanie) | błędy, akcje nieodwracalne | ostrzeżenia, zwykłe akcje |
| `--border` | znaczeniowa | L `warm-gray-92` · D `warm-gray-30` | R01.3 | linia 1px między wierszami list, krawędź karty | krawędź pól (za słaba, zob. `--input`), między wiadomościami w sesji (K2) |
| `--input` | znaczeniowa | L `warm-gray-64` · D `warm-gray-52` | poprawka kontrastu (obecne 1,26:1) | krawędź pól i przycisku outline | linie dzielące listy |
| `--ring` | znaczeniowa | L `petrol-48` · D `petrol-75` (= `primary`) | T1 (fokus w kolorze akcji), T6 | pierścień fokusu w pełnym kolorze | ozdobna obwódka |
| `--sidebar`, `--sidebar-*` | znaczeniowa | aliasy: `card`, `foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `border`, `ring` | T7 (usuwa fiolet 264 z D, AR01) | nawigacja panelu | ekran sesji (R02.6) |
| `--chart-1…5` | znaczeniowa | bez zmian, **bez decyzji** | T7 | — (1.0 nie ma wykresów) | do czasu decyzji nigdzie |
| `--font-ui` | znaczeniowa | `var(--font-sans)` | W02 | cały interfejs | kod, nazwy plików, ceny |
| `--font-code` | znaczeniowa | `var(--font-mono)` | R01.2, W02 | kod, nazwy plików i wersji, ceny | tekst interfejsu, nagłówki |
| `--space-in-group` | znaczeniowa | 8px | prompt (relacja „w grupie”) | etykieta–pole, awatar–nazwa, przyciski obok siebie | między sekcjami |
| `--space-between-groups` | znaczeniowa | 16px | prompt; R02.1, K2 (odstępy w sesji) | pola formularza, wiadomości w sesji | wnętrze wiersza listy |
| `--space-panel` | znaczeniowa | 24px | prompt; zgodne z obecnym `Card` (`px-6`, `gap-6`) | wewnętrzny odstęp karty i panelu | wiersze listy |
| `--space-section` | znaczeniowa | 32px | prompt | między sekcjami panelu | wewnątrz grup |
| `--space-section-public` | znaczeniowa | 48px | W05 (luźniejszy układ) | sekcje strony mentora z linku | panele |
| `--motion-short` | znaczeniowa | 150ms ease-out (= domyślne przejście Tailwind); 0ms przy `prefers-reduced-motion` | W03, T4 | hover, fokus, otwarcie nakładki | animacje ozdobne, wejścia list |
| `--radius` | znaczeniowa | `0.625rem` (bez zmian) | T5 (brak decyzji, obecna wartość) | pola, przyciski, karty | — |
| `--list-row-py` | komponentu | 8px | R01.1, K1 (gęsto na listach) | pionowy odstęp wiersza w `DataTable` i listach | wiadomości w sesji |
| `--list-row-gap` | komponentu | 4px | R01.1, R01.5 | tytuł–linia metadanych w wierszu | między wierszami |

## Pary kolorów i kontrast

Policzone 2026-10-19 skryptem (oklch → sRGB → WCAG 2.x) na wartościach z tabeli. Progi: tekst 4,5 : 1, elementy interfejsu 3 : 1. Pary z kryciem (`/90`, `/60`, `/30`, `/10`) liczone po nałożeniu na `card`. Na wartościach z tabeli **żadna para nie jest poniżej progu**.

| Para | Rodzaj | L | D |
|---|---|---|---|
| `foreground` / `background` | tekst | 17,35 ✓ | 17,03 ✓ |
| `foreground` / `card` | tekst | 17,96 ✓ | 15,61 ✓ |
| `foreground` / `muted` | tekst | 16,13 ✓ | 13,64 ✓ |
| `foreground` / `accent` | tekst | 15,66 ✓ | 12,79 ✓ |
| `muted-foreground` / `background` | tekst | 5,76 ✓ | 7,70 ✓ |
| `muted-foreground` / `card` | tekst | 5,96 ✓ | 7,06 ✓ |
| `muted-foreground` / `muted` | tekst | 5,35 ✓ | 6,17 ✓ |
| `muted-foreground` / `accent` | tekst | 5,19 ✓ | 5,79 ✓ |
| `primary` (link) / `background` | tekst | 6,04 ✓ | 8,81 ✓ |
| `primary` (link) / `card` | tekst | 6,25 ✓ | 8,07 ✓ |
| `primary` (link) / `muted` | tekst | 5,61 ✓ | 7,06 ✓ |
| `primary` (link) / `accent` | tekst | 5,45 ✓ | 6,62 ✓ |
| `primary-foreground` / `primary` (CTA) | tekst | 6,25 ✓ | 8,81 ✓ |
| `primary-foreground` / `primary/90` (CTA hover) | tekst | 4,99 ✓ | 7,38 ✓ |
| `foreground` / `primary/10` L, `primary/15` D (stan aktywny) | tekst | 15,59 ✓ | 11,82 ✓ |
| `primary` / `primary/10` L, `primary/15` D (aktywny element w kolorze akcji) | tekst | 5,43 ✓ | 6,12 ✓ |
| `destructive` / `background` | tekst | 5,57 ✓ | 7,23 ✓ |
| `destructive` / `card` | tekst | 5,77 ✓ | 6,62 ✓ |
| `destructive` / `muted` | tekst | 5,18 ✓ | 5,79 ✓ |
| `white` / `destructive` (przycisk L) | tekst | 5,82 ✓ | — |
| `white` / `destructive/90` (hover L) | tekst | 5,02 ✓ | — |
| `white` / `destructive/60` (przycisk D) | tekst | — | 5,50 ✓ |
| `foreground` / `input/30` (tło pola D) | tekst | — | 11,57 ✓ |
| `muted-foreground` (placeholder) / `input/30` (D) | tekst | — | 5,23 ✓ |
| `primary` (CTA) / `background` | interfejs | 6,04 ✓ | 8,81 ✓ |
| `primary` (CTA) / `card` | interfejs | 6,25 ✓ | 8,07 ✓ |
| `input` (krawędź pola) / `background` | interfejs | 3,23 ✓ | 3,47 ✓ |
| `input` (krawędź pola) / `card` | interfejs | 3,34 ✓ | 3,18 ✓ |
| `ring` (fokus, pełny kolor) / `background` | interfejs | 6,04 ✓ | 8,81 ✓ |
| `ring` / `card` | interfejs | 6,25 ✓ | 8,07 ✓ |
| `ring` / `muted` | interfejs | 5,61 ✓ | 7,06 ✓ |
| `border` (linia dzieląca) / `background` | dekoracja, poza progiem | 1,23 | 1,40 |
| `border` (linia dzieląca) / `card` | dekoracja, poza progiem | 1,28 | 1,28 |

Pary, które dziś nie spełniają progu i które ten dokument poprawia:

- `muted-foreground` / `muted` L: 4,34 ✗ → 5,35 ✓ (ciemniejszy `muted-foreground`).
- `input` / `card`: L 1,26 ✗, D 1,57 ✗ → 3,34 / 3,18 ✓ (`--input` jako krawędź kontrolki).
- `ring` / `background` L: 2,59 ✗ → 6,04 ✓.
- `ring/50` / `background` (obecna klasa w komponentach shadcn) przy nowych wartościach: L 2,19 ✗, D 3,01 (na samej granicy). Wartość tokenu tego nie naprawi, naprawia to zasada Z7 (pełny kolor pierścienia).

Ostrzeżenia na granicy:

- `primary-foreground` / `primary/90` L = 4,99 : 1. Hover CTA nie może być jaśniejszy niż `/90`.
- `input` / `card` D = 3,18 : 1. Rozjaśnienie `card` w trybie ciemnym zepchnie tę parę poniżej 3 : 1.
- Linia `border` nie spełnia 3 : 1, co jest dopuszczalne tylko dlatego, że jest dekoracją. Nie używaj jej jako jedynej granicy pola ani kontrolki.

Każda zmiana wartości koloru wymaga ponownego przeliczenia tej tabeli przed zapisaniem.

## Decyzje, które nie są tokenami

| # | Rodzaj | Decyzja | Pochodzenie |
|---|---|---|---|
| Z1 | zasada | Na ekranie najwyżej jeden przycisk w kolorze `primary` (CTA). Pozostałe akcje mają wariant outline lub ghost. | R01.5, W01 |
| Z2 | zasada | Linki w tekście mają kolor `primary` i podkreślenie, żeby nie polegać na samym kolorze. | W01, T1 |
| Z3 | zasada | Stan aktywny (wybrana pozycja nawigacji, wybrany termin, aktywna zakładka) ma tło `primary/10` (L) lub `primary/15` (D) i tekst `foreground` albo `primary`. Bez nowego koloru. | T1 („aktywne stany”) |
| Z4 | cecha komponentu | Wiersz listy to tytuł (14px, 600, `foreground`) i jedna linia metadanych (12px, `muted-foreground`), z odstępem `list-row-gap`. Wiersze dzieli `border` 1px. Bez kart, cieni i tła wiersza. Najechanie podświetla `accent`. | R01.1, R01.3, R01.5, K1 |
| Z5 | cecha komponentu | Ekran sesji to jedna kolumna wiadomości wyrównanych do lewej, bez dymków i linii, z odstępem `space-between-groups`. Nagłówek wiadomości: autor i godzina (`muted-foreground`). Pole pisania przypięte na dole, bez paska bocznego. Opis problemu to zwarty nagłówek na `muted`. Bez reakcji emoji. | R02.1–R02.3, R02.5, R02.6, K2 |
| Z6 | zasada | `font-code` dla kodu, nazw plików, wersji i cen. Ceny dodatkowo z `tabular-nums`. | R01.2, W02 |
| Z7 | cecha komponentu | Komponenty shadcn (`button`, `input`, `textarea`, `badge`) przechodzą z `ring-ring/50` na `ring-ring`, bo pierścień z 50% krycia nie spełnia 3 : 1. | T6 |
| Z8 | zasada | Ruch to tylko przejścia stanu w czasie `motion-short`. `tw-animate-css` tylko do wejścia i wyjścia nakładek. Żadnych animacji ozdobnych. Przy `prefers-reduced-motion` bez przejść. | W03, T4 |
| Z9 | zasada (produkt) | Powiadomienia tylko o nowej rezerwacji, odwołaniu i starcie sesji. | R02.4 |
| Z10 | zasada (treść) | Ton komunikatów: co się stało i co zrobić. Bez wykrzykników, obietnic i emoji. | W04, R02.5 |
| Z11 | zasada | Strona mentora z linku używa tych samych tokenów koloru i fontu, a sekcje rozdziela `space-section-public`. | W05 |
| Z12 | zasada (review) | Zakazy z AR01, sprawdzalne grepem: `bg-gradient-*`, `backdrop-blur`, półprzezroczyste tła kart (`bg-white/10` itp.), `bg-clip-text text-transparent`, ikona `Sparkles`. | AR01 |
| Z13 | zasada (treść i komponenty) | Bez gwiazdek, liczników popularności, pasków postępu, certyfikatów, plakietek „dostępny teraz”, kroków „1 z 5” i rankingów mentorów. | AR02–AR08 |
| Z14 | zasada | Kolor wolno brać tylko z tokenów znaczeniowych. Surowe klasy palety Tailwind (`zinc-*`, `black`, `#383838` itp.) w komponentach i stronach są zabronione. Dziś łamie to `packages/app/app/(marketing)/page.tsx` (szablon create-next-app) — do wymiany przy stronach publicznych. | warstwy tokenów, AR01/P09 |

## Otwarte

- Rodzina „ruch i reakcja” poza minimum (Z8) pozostaje luką (referencje.md).
- `--chart-*` bez decyzji: 1.0 nie ma wykresów.
- `--radius` zostaje z shadcn bez decyzji o kształcie (T5).
- Wdrożenie (osobny krok, nie w tym pliku): wartości w `packages/ui/src/styles/globals.css`, fonty IBM Plex w `packages/app/app/layout.tsx`, poprawka Z7 w komponentach shadcn.
