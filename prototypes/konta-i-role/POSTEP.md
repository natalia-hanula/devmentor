# POSTĘP — klikalny prototyp „konta i role” (Epik 01)

Prompt: `lekcja-07/klikalny-prototyp-devmentor.txt` (etapy 0–3, stop po każdym etapie, czekam na „dalej”).

## Materiały (źródła prawdy)

| Co | Plik | Uwagi |
|---|---|---|
| Mapa ekranów | `lekcja-07/mapa-ekranow.md` | zatwierdzona 2026-10-20, decyzje L01–L24; identyfikatory s01–s13, sNN.M, e01 się nie zmieniają |
| Spec E01 | `.ai/specs/2026-10-18-e01-konta-i-role.md` (rewizja 4) | pliku `2026-09-04-accounts-and-roles.md` z paczki nie ma; wybór potwierdzony przez Natalię |
| Prymitywy platformy | `.ai/specs/2026-10-18-platform-primitives.md` | bramki stron, outbox, nawigacja operatora |
| Brief | `.ai/specs/product-brief.md` | nazwy ról, R17, R21, D13, D18, D23 |
| Szary prototyp | `.ai/prototypes/discovery/mentor-onboarding/revision-001/` (najnowsza rewizja) | biorę tylko zaproszenie (s08) i dostęp bez roli (s13) oraz reguły R21/D18 i założenie A-11 (dane zostają po 503) |
| Design system | `packages/ui/src` (etap 1 DS: tokeny + 7 prymitywów + warstwa `backend/`) | |
| Silnik przeglądu | `lekcja-07/silnik-przegladu/` | |

## Etapy

| Etap | Stan | Data |
|---|---|---|
| 0. Plan | zakończony, plan zatwierdzony | 2026-10-20 |
| 1. Szkielet i ścieżka bez błędów | zakończony, czeka na „dalej” | 2026-10-20 |
| 2. Stany, role i scenariusze | nie rozpoczęty | — |
| 3. Uczciwość i sprawdzenie | nie rozpoczęty | — |

## Plan (etap 0)

### Technologia i uruchomienie

- **React 19 + Vite 8 + Tailwind 4** — wszystko już jest w `node_modules` w katalogu głównym; **żadnych nowych zależności**. JSX kompiluje wbudowany w Vite 8 Oxc (sprawdzone: `transformWithOxc` z `runtime: 'automatic'`), więc `@vitejs/plugin-react` nie jest potrzebny (nie ma HMR — budujemy wynik, nie dev serwer).
- **Źródło:** `prototypes/konta-i-role/` w katalogu głównym (`index.html`, `vite.config.ts`, `tsconfig.json`, `src/`, `test/`, `README.md`, `POSTEP.md`). Nie jest workspace’em npm i nic go nie importuje.
- **Design system** importowany przez nazwę pakietu (`@devmentor/ui/components/ui/button`, `@devmentor/ui/backend/forms/crud-form`, `@devmentor/ui/globals.css`) — rozwiązuje się przez symlink workspace’u w `node_modules/@devmentor/ui`. Zero kopii komponentów.
- **Wynik budowania:** `vite build` z `base: './'` i `outDir` = `packages/ui/.storybook/public/prototypes/konta-i-role/` (już w `.gitignore`, nie commitujemy). Podgląd: Storybook na porcie **6006** → `http://localhost:6006/prototypes/konta-i-role/index.html`.
- Polecenia (z katalogu głównego): `npx vite build --config prototypes/konta-i-role/vite.config.ts` (jednorazowo) albo z `--watch` przy pracy; Storybook serwuje `staticDirs` na żywo, wystarczy odświeżyć.
- **Silnik przeglądu:** kopia `prototype.js`, `prototype.css` bez zmian; `comments.js` z `prototypeId: 'konta-i-role'`; `mostek.css` przepięty na tokeny DS (bez własnych kolorów — zob. DS16).
- **Stan symulacji:** jeden magazyn w pamięci (React context + reducer): zalogowane konto, konta K1–K8, zaproszenia, skrzynka, „sessionStorage” zaproszenia (symulowany w pamięci), flagi scenariuszy. Zegar demo stały: **śr. 2026-10-21 10:00 Europe/Warsaw** (mapa; szary prototyp miał 20.10 — mapa wygrywa).
- **Ekrany wg umowy silnika:** każdy ekran to stała `section.screen#sNN` z `.screen-meta` (ID, nazwa, symulowany adres np. `/login?next=/mentor`, wybór stanu sNN.M) i `.frame` (sam produkt). Nawigacja produktu przez `prototype:navigate`; `window.__PROTOTYPE_START__()` po pierwszym renderze. Ekran startowy: **s02** (logowanie — każda rola tędy wchodzi; ścieżka zaproszenia zaczyna się od s12/s08).

### Pasek przeglądu (`.doc-toolbar`, osobno od produktu)

- Oznaczenie **„Prototyp — dane fikcyjne, nic nie jest wysyłane”**, wybór ekranu (`.screen-nav`, s01–s13), przełącznik motywu (jasny/ciemny przez klasę `.dark` na `<html>`, jak Storybook), przyciski silnika (Comment, Present, Map, ← Back), „Resetuj symulację”.
- Panel **„Scenariusze”** (rozwijany): SC-01…SC-15 z mapy:

| ID | Kontrolka | Wartości |
|---|---|---|
| SC-01 | Zalogowane konto | gość, K1…K8 |
| SC-02 | GitHub skonfigurowany | tak / nie (w etapie A zawsze „nie”) |
| SC-03 | Wynik GitHuba [B] | 10 wariantów z mapy |
| SC-04 | Poczta | outbox / `noop` |
| SC-05 | Wysyłka e-maila | udana / nieudana |
| SC-06 | Następne żądanie | normalnie / 429 / 503 / opóźnione (jednorazowe — wraca do „normalnie” po użyciu) |
| SC-07 | Link weryfikacyjny | ważny / innego konta / wygasły lub zużyty / brak tokenu |
| SC-08 | Link resetu [B] | ważny / wygasły / brak tokenu |
| SC-09 | Zaproszenie | ważne / nieważne / brak tokenu |
| SC-10 | Sesja wygasła | przy następnym żądaniu |
| SC-11 | Operator odebrał rolę mentora | przy następnym żądaniu |
| SC-12 | Wyścig przy tworzeniu zaproszenia | 409 przy następnym „Zaproś” |
| SC-13 | Hasło odrzucone przez politykę [B] | przy następnym wysłaniu |
| SC-14 | Etap A / A+B | domyślnie A+B (L01); w A znikają elementy „[etap B]” |
| SC-15 | Zegar demo | „teraz” / „teraz + 25 h” |

- Dodatkowo w `.screen-meta` każdego ekranu: **wybór stanu sNN.M** (skrót dla recenzenta, żeby każdy ze 100 stanów był osiągalny jednym kliknięciem; obok stan jest też osiągalny „naturalnie” klikaniem albo scenariuszem).

### Konta demo (z mapy, sekcja 3 — bez zmian)

K1 Marta Kowal (mentee, adres potwierdzony, zajęty e-mail do s01.7) · K2 Piotr Lis (mentee, niepotwierdzony, `exmaple.com`) · K3 `jkrol-dev` (mentee, tylko GitHub [B]) · K4 Ewa Zielińska (mentee + mentor) · K5 Tomasz Wrona (mentee + mentor, niepotwierdzony) · K6 Operator Demo (operator) · K7 Adam Nowy (gość z ważnym zaproszeniem) · K8 Karol Sowa (mentee, rola mentora odebrana). Hasło „poprawne” = `demo-haslo-12`, każde inne → s02.4. Pole hasła ma dopisek, że to symulacja i nie należy wpisywać prawdziwego hasła; nic nie jest zapisywane poza pamięcią karty. Zaproszenia i skrzynka — dokładnie jak w mapie. Bez cen, terminów, ocen, liczby użytkowników.

### Kolejność budowy

**Etap 1 — szkielet + ścieżki bez błędów:**
1. Szkielet: Vite, DS, silnik, mostek, pasek przeglądu (ekran, motyw, „Prototyp”), magazyn stanu, 13 sekcji ekranów (na razie z domyślnym stanem).
2. s02 Logowanie (s02.1, s02.8, s02.13) → strona startowa roli.
3. s01 Rejestracja (s01.1, s01.10) → s04.
4. s04 Konto + e01 nagłówek (s04.2, s04.10, s04.9 wylogowanie).
5. s12 Skrzynka (s12.1, s12.3) → linki do s05/s08.
6. s08 Zaproszenie: K7 gość → s01.11 → s08.2 → s08.3 → s08.4 → s09.1 (ścieżka szarego prototypu).
7. s09 Panel mentora (s09.1).
8. s11 Zaproszenia operatora (s11.3 → s11.4 → s11.5), s10 Przegląd (s10.1).
9. s05 Potwierdzenie e-maila (s05.1 → s05.2).

**Etap 2 — stany, role, scenariusze:** pozostałe stany s01–s12, s13 (brak dostępu), s03/s06/s07 [B], bramki (gość → `/login?next=…`, zła rola → s13), wszystkie SC, przełączanie kont, zachowanie danych po błędzie i tokenu zaproszenia po wygaśnięciu sesji.

**Etap 3:** notatki `.notes` przy ekranach (historie, symulacje, czego nie rozstrzyga), README z „Ograniczeniami symulacji”, testy nawigacji (Vitest + Testing Library w `jsdom`, osobny `vitest.config.ts` prototypu, poza `npm test`), przejście w przeglądarce (`agent-browser`): 320 i 1440 px, jasny/ciemny, klawiatura, każdy przycisk i kontrolka.

### Komponenty DS na ekranach

| Ekran | Z DS | Luki (budowane z tokenów, oznaczone w kodzie `LUKA DSxx`) |
|---|---|---|
| s01, s02 | `Card`, `Input`, `Label`, `Button` (outline, link), `buttonVariants` na `<a>` | DS01 (formularz e-mail/hasło: własny prosty formularz z `Input type=email/password` + `autocomplete`, bo `CrudForm` ma tylko text/textarea), DS02, DS03, DS04, DS05 |
| s03 [B] | `Card`, `Button` | symulacja usługi zewnętrznej — wyraźny podpis, nie produkt |
| s04 | `Card`, `Badge`, `Button`, `CrudForm` (nazwa [B]), `LoadingMessage`, `ErrorMessage` | DS02, DS06, DS10 |
| s05 | `Card`, `LoadingMessage`, `ErrorMessage`, `Button` | DS02, DS05 |
| s06, s07 [B] | `Card`, `Input`, `Label`, `Button`, `ErrorMessage` | DS01, DS02, DS05 |
| s08 | `Card`, `Button`, `LoadingMessage`, `ErrorMessage` | DS05 |
| s09 | `Card`, `Button`, `ErrorMessage`, `LoadingMessage` | DS02, DS06 |
| s10 | `Card`, `Badge`, `Button`, `LoadingMessage`, `ErrorMessage` | DS06 |
| s11 | `DataTable` (+ `rowActions`), `CrudForm` (e-mail), `Badge`, `Button`, `Card`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, `Input` (readonly) | DS07 (potwierdzenie inline zamiast dialogu), DS08, DS09 (zamiast toastu komunikat `role=status`), DS10 |
| s12 | `DataTable`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, `Card` | DS02, DS12 (rozwinięcie jako `Card` pod tabelą) |
| s13 | `ErrorMessage` (tytuł + zdanie, bez `onRetry`), `Button` | DS11 (akcje pod komunikatem) |

Uwaga: `DataTable` i `CrudForm` nie wołają `fetch` same — przyjmują dane i `onSubmit` zwracające `ApiResult`, więc symulacja odpowiada kopertą `{ ok, data | error }` (z `fieldErrors`). `apiCall` nie jest używany (nie ma API).

### Luki w design systemie

DS01–DS15 z mapy (sekcja 5) oraz nowe, znalezione przy planie:

| ID | Brak | Jak w prototypie |
|---|---|---|
| DS16 | Brak tokenów stanu „sukces” i „ostrzeżenie” (są tylko `destructive`, `muted`, `primary`) | `mostek.css` i banery ostrzeżeń mapuję na istniejące tokeny (`--primary`, `--muted`, `--foreground`, `--destructive`) zamiast fallbacków `#15803d`/`#b45309` z szablonu mostka |
| DS17 | — (wycofana: symulowany adres jest w pasku przeglądu, nie w produkcie) | — |

## Odpowiedzi Natalii (etap 0, 2026-10-20)

1. Tak. 2. Tak — `prototypes/**` dopisane do `globalIgnores` w `eslint.config.mjs`. 3. Tak.
4. Rozszerzenie `CrudForm` o e-mail/hasło (DS01, L24) zostaje osobnym zadaniem przed implementacją — w prototypie zostaje luka.

## Pytania do Natalii (etap 0) — rozstrzygnięte

1. Źródło w `prototypes/konta-i-role/` w katalogu głównym (commitowane), wynik budowania w `packages/ui/.storybook/public/prototypes/konta-i-role/` (niecommitowany) — OK?
2. Root `eslint` obejmie `prototypes/**`. Dopisać `"prototypes/**"` do `globalIgnores` w `eslint.config.mjs` (jedna linia, jak przy `lekcja-07/**`), czy trzymać źródło prototypu w czystości pod regułami aplikacji?
3. Wybór stanu sNN.M w `.screen-meta` jako skrót recenzenta (obok naturalnej ścieżki) — OK?

## Etap 1 — co powstało

**Uruchomienie:** z katalogu głównego `npx vite build --config prototypes/konta-i-role/vite.config.ts` (dodaj `--watch` przy pracy), Storybook `npm run storybook` (port 6006), adres `http://localhost:6006/prototypes/konta-i-role/index.html`. Po przebudowie twarde odświeżenie (cache `index.html`). Typy: `npx tsc -p prototypes/konta-i-role/tsconfig.json`.

**Pliki** (`src/`): `sim/` (dane demo, katalog ekranów i stanów, magazyn i trasy z bramkami, schemy Zod, skróty recenzenta), `screens/` (s01–s13), `gaps/` (luki DS: `Notice` DS02, `OrSeparator` DS03, link OAuth DS04, `AuthLayout` DS05, `PanelShell` + e01 DS06, `AuthForm` DS01, `SimNote` — adnotacja symulacji), `review/` (pasek przeglądu, style warstwy przeglądu), `engine/` (silnik przeglądu bez zmian, `comments.js` z `prototypeId: 'konta-i-role'`, `mostek.css` na tokenach DS).

**Pasek przeglądu:** oznaczenie „Prototyp · dane fikcyjne · nic nie jest wysyłane”, nawigacja s01–s13 (wejście przez bramki tras — gość na `/mentor` trafia na `/login?next=/mentor`), wybór stanu sNN.M bieżącego ekranu (stany z etapu 2 wyszarzone z dopiskiem), symulowany adres, bieżące konto, „Resetuj symulację”, przełącznik motywu, przyciski silnika (Clickable/Comment, hotspoty, Presentation, Threads, piny, ← Back).

**Ścieżki bez błędów (przeklikane):**
1. Zaproszenie gościa: s08.1 → „Załóż konto” → s01.11 → rejestracja Adama (K7) → s08.2 → „Przyjmij zaproszenie” → s08.3 → s09.2 (adres niepotwierdzony).
2. Operator: s02 → K6 → s11.3 → „Zaproś mentora” → s11.4 → s11.5 (link, „Kopiuj” → „Skopiowano”) → s12 → rozwinięcie (s12.3) → link → s13.2 (operator na `/invite`).
3. Mentee: rejestracja → s04.3 → (operator) s12 → link weryfikacyjny → s05.8; gość z linkiem K2 → s05.2, drugi raz → s05.3.
4. Logowanie z `next`: gość → s09 → `/login?next=/mentor` → K4 → s09.1. Wylogowanie z e01, s04 i s13 → s02.13.
5. Operator: „Cofnij” (s11.9), „Odbierz rolę mentora” z potwierdzeniem (s11.10 → „rola mentora odebrana”; K4 loguje się potem na `/account`), s10 „Odśwież”.

**Stany gotowe (46 ze 100):** s01.1, .4, .10, .11 · s02.1, .3, .8, .9, .11, .13 · s04.1–.4, .9, .10 · s05.1–.5, .8 · s08.1–.6, .8 · s09.1, .2, .5, .7 · s10.1, .3 · s11.1, .3, .4, .5, .9, .10 (tylko wariant sukcesu) · s12.1, .3, .4 · s13.1, .2. Reszta (w tym s03, s06, s07 [B]) pokazuje jawną adnotację „stan powstanie w etapie 2”. Bramki ról i s13 powstały już w etapie 1, bo bez nich nie da się poprawnie wejść na ekrany paneli.

**Odstępstwa od planu:** s13 i bramki w etapie 1 (wyżej); adres symulowany w pasku zamiast w ramce (DS17 wycofana); start silnika w `useEffect` (`requestAnimationFrame` startował przed renderem Reacta i silnik się nie uruchamiał).

## Etap 1 — sprawdzone

| Co | Wynik |
|---|---|
| `tsc -p prototypes/konta-i-role` | przechodzi |
| `vite build` | przechodzi (ostrzeżenia Rolldown o `"use client"` z Radix — bez wpływu) |
| Przeglądarka (`agent-browser` 0.39.1, Storybook 6006) | ścieżki 1–5 wyżej; walidacja pól (fokus na pierwszym błędnym, dane zostają po błędzie), 409 przy zajętym e-mailu (normalizacja wielkości liter i spacji), ogólny 401 przy złym haśle |
| 1440 px jasny, 320 px ciemny | bez poziomego przewijania strony (`scrollWidth` 320); tabela s11 przewija się w swoim kontenerze |
| Klawiatura | logowanie samą klawiaturą (Tab ×2 do e-maila, Enter wysyła), po przejściu fokus na `h1` ekranu |
| Silnik przeglądu | tryb komentarzy: pin, licznik w nawigacji, panel wątków; tryb dokumentu: 13 ekranów z `.screen-meta`; testowy komentarz usunięty z `localStorage` |

Poprawione po sprawdzeniu: start silnika; `max-w-panel` (DS20); przycisk wychodzący poza baner przy 320 px (DS21); przyklejony pasek przeglądu zajmował ⅓ ekranu przy 320 px (teraz statyczny poniżej 40 rem); „← Back” widoczny w trybie dokumentu.

**Niesprawdzone w etapie 1:** 320 px na każdym ekranie (sprawdzone s05 i s11), ciemny motyw na każdym ekranie, pełne przejście klawiaturą przez panele, czytnik ekranu, eksport komentarzy (przyciski widoczne, nie klikane). To zakres etapu 3.

## Luki w design systemie znalezione przy budowie

| ID | Brak | Jak w prototypie |
|---|---|---|
| DS19 | `CardTitle` renderuje `<div>`, a strona potrzebuje `h1`/`h2` (silnik i czytniki szukają nagłówka) | własne `h1`/`h2` z tokenem typografii |
| DS20 | Kolizja nazw: `max-w-panel` = `--spacing-panel` (24 px) zamiast `--container-panel` (72 rem) | `max-w-(--layout-panel-max)`; wpis w `.ai/lessons.md` |
| DS21 | `Button` ma `whitespace-nowrap` i stałą wysokość — długa etykieta wychodzi poza wąski ekran | `h-auto whitespace-normal` na jednym linku |
| DS22 | `DataTable` nie ma układu na wąski ekran (przewija się poziomo) | bez zmian |
| DS23 | `CrudForm` nie przenosi fokusu na pierwsze błędne pole (spec E01 UI/UX tego wymaga) | `AuthForm` przenosi; s11 (`CrudForm`) nie |
| — | Mapa (DS04) zakłada ikonę GitHuba z lucide — w `lucide-react` 1.x nie ma ikon marek | sam tekst |

## Pytania do specyfikacji, które wyszły przy budowie

1. **„14 dni” zaproszenia przy zmianie czasu (25.10):** zaproszenie utworzone 21.10 o 10:00 wygasa 04.11 o 09:00 (14 × 24 h) czy o 10:00 (14 dni kalendarzowych)? Dane z mapy zakładają kalendarz, prototyp liczy 14 × 24 h.
2. **`DISPLAY_NAME_MAX_LENGTH`** jest w spec bez wartości — prototyp nie sprawdza długości nazwy (s01.5 „za długa nazwa” czeka na liczbę).
3. **Ponowna wysyłka linku weryfikacyjnego:** czy stary link przestaje działać (upsert jak przy resecie)? Prototyp zostawia oba ważne; tekst potwierdzenia tego nie obiecuje.
4. **s08.2:** czy pokazać, które konto dostanie rolę („Rolę mentora dostanie konto …” — propozycja, bo link jest na okaziciela, Q15)?
5. **Treść wiadomości w skrzynce** (zaproszenie, weryfikacja, reset) nie jest opisana w spec — w prototypie propozycje.

## Dziennik

- 2026-10-20 — etap 0: przeczytane materiały, sprawdzone API komponentów (`CrudForm`, `DataTable`, `feedback/*`, `Button`, `Badge`), tokeny (`tokens.css`), konfiguracja Storybooka (`staticDirs: ['./public']`, `.gitignore` już wyłącza `public/prototypes/`), silnik przeglądu. Niczego nie budowałam.
- 2026-10-20 — etap 1: szkielet (Vite 8 + React 19 + DS przez nazwę pakietu, bez nowych zależności), silnik przeglądu, pasek przeglądu, 13 ekranów, 46 stanów, ścieżki bez błędów przeklikane w przeglądarce (szczegóły wyżej).
