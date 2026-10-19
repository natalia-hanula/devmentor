# Raport: generyczny wygląd i UX — `lekcja-06/02-rekrutacja.html`

Plików projektu nie zmieniałem. Pomiary zrobiłem w `agent-browser` 0.35.2 z Chrome for Testing. Przeglądarka jest zainstalowana w `~/.cache`, poza repozytorium. Sprawdzałem przy szerokościach 1440, 768 i 320 px.

**Jak liczyłem kontrast:** z wyliczonych stylów, ze składaniem przezroczystości i z kolorem gradientu wyliczonym w punktach, gdzie leżą litery. Nie odczytywałem pikseli ze zrzutu, bo nie miałem biblioteki do obrazów. Dlatego pominąłem dwie rzeczy: poświatę `.hero::before` (leży z dala od tekstu po lewej) i kropki 15% bieli w CTA.

**Test bez JS:** zrobiłem go na kopii pliku w scratchpadzie, z której usunąłem `<script>`.

## Krok 1. Znaki generycznego wyglądu

| Znak | Stan | Gdzie |
|---|---|---|
| Indygo/fiolet jako kolor akcji | **występuje** | `--primary: #4f46e5` (:14), to indigo-600 z Tailwinda; fiolet `#7c3aed` w CTA (:724) |
| Gradient w tekście nagłówka | **występuje** | `.gradient-text` (:186), „naprawdę Ci pasuje” (:885); to samo w liczbach statystyk (:410–418) |
| Gradient w tle / na przycisku | **występuje** (tło) | hero (:134), CTA (:724), kwadrat logo (:103), paski lejka (:653); na przyciskach nie ma |
| Ciemnogranatowe tło z poświatą | nie występuje | stopka `#0f172a` jest bez poświaty; poświata jest tylko w jasnym hero (:137) |
| Duże zaokrąglenia i pigułki | **występuje** | 10–24 px na kartach, 999 px na badge, tagach, chipach, `.match`, `.plan-badge`, paskach |
| Cień jako jedyny podział | nie występuje | karty mają ramkę 1 px, cień dochodzi głównie w hover |
| Karta w karcie | **występuje** | kafle `.kpi` w karcie `.dashboard` (:604–635, :1268) |
| Półprzezroczyste rozmyte panele | **występuje** | header `rgba(255,255,255,.9)` + `blur(12px)` (:81–82) |
| Pigułka z liczbą nad nagłówkiem | **występuje** | „Ponad 12 000 aktywnych ofert pracy” z pulsującą kropką (:884) |
| Wyróżnione kolorem słowo w nagłówku | **występuje** | :885 |
| Para „za darmo / demo” | **występuje** (odpowiednik) | „Utwórz darmowe konto” + „Jestem pracodawcą” (:1383–1384); „Wypróbuj za darmo przez 14 dni” (:1263) |
| Rząd wielkich liczb | **występuje** | `.stats-grid` (:969–974) i do tego KPI w dashboardzie |
| Trzy identyczne karty z ikoną | **występuje** | 3 kroki z kaflem numeru (:992), 3 opinie, 3 plany, 8 kart kategorii z kaflem ikony |
| Karty unoszące się nad pierwszym ekranem | **występuje** | `.float-card` z nieskończoną animacją `float` (:255–327) |
| Logo jako kolorowy kwadrat z ikoną | **występuje** | `.logo-icon` z gradientem (:99, :858); odpowiednik: „logotypy” firm jako kwadrat z inicjałami (:531) |
| Awatary z inicjałami | **występuje** | :916–932, :1300–1317 |
| Emoji zamiast ikon | nie występuje | gwiazdki to znak ★, nie emoji |
| Iskierki jako AI | nie występuje | AI ma ikonę pioruna (:1247) |
| Ikony na kolorowym tle przy nagłówkach | **występuje** | `.category-icon`, `.feature-icon`, `.stat-icon` |
| Puste obietnice | **występuje** | „naprawdę Ci pasuje”, „Prosty proces, szybkie efekty”, „Rekrutuj mądrzej, nie ciężej”, „szybciej niż kiedykolwiek” |
| Liczby, opinie i firmy spoza danych | **występuje** | wszystko zmyślone (mówi to komentarz w :2); niespójności opisuje wiersz 4 tabeli |

## 1. Najważniejsze znaleziska

| # | Znak lub błąd | Gdzie | Co widać | Dlaczego problem | Czym zastąpić | Pewność |
|---|---|---|---|---|---|---|
| 1 | Paleta Tailwinda 1:1, indygo jako akcja | :14–26 i 99 wystąpień poza `:root` | indigo, cyan, amber, gray, slate, emerald bez zmian; cienie mają geometrię `shadow-md`/`shadow-lg`; font Inter | generyczny wygląd | kolor akcji i neutralne wynikające z marki | sprawdzone |
| 2 | Gradient indygo→cyjan na tekście i tłach | :186, :410, :724 | najgorszy punkt: h1 „pasuje” **2,33 : 1**; liczby statystyk **2,71–3,16** (próg 3 : 1); akapit CTA **4,34 : 1** (próg 4,5) | generyczny + dostępność | płaski kolor tekstu; tło CTA płaskie | sprawdzone |
| 3 | Formuła hero: pigułka z liczbą, kolorowe słowo, pływające karty | :884–948 | przy 1440 px karta „+2 345” zasłania imię 4. kandydata. Animacja trwa bez końca, nie ma `prefers-reduced-motion` ani pauzy | generyczny + UX + dostępność (WCAG 2.2.2) | prawdziwy fragment produktu, statyczny | sprawdzone (zrzut) |
| 4 | Zmyślone liczby, które się nie zgadzają | :1274–1280, :1036–1092, :970–973 | **paski lejka nie odpowiadają liczbom**: 412/1284 = 32%, a pasek ma 62%; 158 → 12% vs 34%; 96 → 7,5% vs 20%; 31 → 2,4% vs 9%; 23 → 1,8% vs 6%. Kategorie sumują się do 11 315 przy „ponad 12 000”. „3500+” obok „3 500” (`toLocaleString` nie grupuje liczb 4-cyfrowych). KPI „Rozmowy 96” przy lejku 158 HR + 96 tech. „TechNova” i „Wieża Kodu” spoza listy firm. Same oceny 5★ | generyczny + wiarygodność | dane z jednego źródła albo żadne | sprawdzone (rachunek) |
| 5 | Inicjały na kolorowym tle (awatary i „logo” firm) | :916–932, :1111–1215, :1300 | biały tekst: na `#f59e0b` **2,15**, `#06b6d4` **2,43**, `#ec4899` **3,53**, `#6366f1` **4,47**; BK **3,13**, SL **3,30** (18 px to jeszcze nie duży tekst) | generyczny + dostępność | prawdziwe logo/zdjęcia albo neutralny placeholder | sprawdzone |
| 6 | Kontrast drobnego tekstu w stanach | `.match` :291, `.chip.green` :570, `.kpi em` :638, `.stars` :672, `.logo-row` :364, `.footer-bottom` :786 | 98%/94%… **2,41**; „UoP” **3,58**; „+18%” **2,43**; ★ **2,15**; nazwy firm **2,54**; © **3,75**; ikony ✓ w cenniku **2,54** (próg 3 : 1) | dostępność | ciemniejsze odcienie tekstu dla zieleni i bursztynu | sprawdzone |
| 7 | Treść znika bez JS | `.reveal` :804, skrypt :1513 | 30 bloków z `opacity: 0`, ok. 66% tekstu strony (3655 z 5576 znaków); liczniki pokazują „0”; zakładki i menu mobilne nie działają | UX + dostępność | domyślnie widoczne, animacja jako dodatek | sprawdzone |
| 8 | Niewidoczny fokus | :222 (`outline: none`), :777 | oba pola wyszukiwarki nie mają żadnego wskaźnika fokusu (Tab, zrzut). Newsletter: ramka `#4f46e5` na `#1e293b` daje **2,33 : 1** | dostępność (2.4.7, 1.4.11) | `:focus-visible` z obrysem ≥ 3 : 1 | sprawdzone |
| 9 | Pola bez etykiet | :891, :895, :1434 | 3 inputy bez `<label>` i bez `aria-label`, opisuje je tylko placeholder. Przy 1440 px placeholder jest ucięty: „Stanowisko, firma lub” | dostępność + UX | widoczne etykiety | sprawdzone |
| 10 | 320 px: przewijanie w poziomie | `.stats-grid` :833, `.plan` | dokument ma 494 px szerokości; liczby „850 000+” i „14 dni” są ucięte, karty cennika mają 361 px | UX | 1 kolumna albo mniejszy font liczb | sprawdzone (zrzut) |
| 11 | Mobile: brak logowania | :817, :847 | poniżej 900 px „Zaloguj się” nie ma nigdzie na stronie, poniżej 600 px w nagłówku nie ma też „Dodaj ogłoszenie”. Przycisk menu nie ma `aria-expanded` | UX + dostępność | akcje konta w menu | sprawdzone |
| 12 | Elementy udające interaktywne | `.tag` :237, `.category` :486, `.job` | tagi to `<span>` z `click`, niedostępne z klawiatury; karty kategorii mają `cursor: pointer` i nic nie robią; karta oferty nie jest linkiem; wszystkie `href="#"` | UX + dostępność | prawdziwe linki i przyciski | sprawdzone |
| 13 | Brak stanów | skrypt :1477, :1483 | wyszukiwanie tylko przewija do statycznej listy, bez wyników, pustki, ładowania i błędu. Newsletter pokazuje „Dzięki!” bez wysyłki i bez stanu błędu | UX | stany wyników, pustki i błędu | sprawdzone |
| 14 | Szablonowy układ sekcji | cała strona | eyebrow + h2 + lead w każdej sekcji, siatki 3/4 kart, para CTA, „Najpopularniejszy” na pigułce | generyczny | struktura z zadań użytkownika (szukam / rekrutuję) | sprawdzone |
| 15 | Puste obietnice | :885–886, :982, :1243, :1022 | hasła, które nie mówią nic konkretnego o produkcie | generyczny | konkret: widełki płac, czas odpowiedzi itp. — o ile są w danych | sprawdzone |

## 2. Pozostałe znaleziska

- **Rozbite logo:** `gap: 10px` w `.logo` (:94) rozdziela „Talent” i „Hub” (:861). Widać to na zrzucie.
- **Długość linii:** przy 1440 i 320 px żadna linia nie przekracza 75 znaków. Przy **768 px** przekraczają: kroki „Jak to działa” (80–83 znaki), opinie (78–85), lead sekcji pracodawców (80; styl inline :1244 bez `max-width`), opisy funkcji (79–85), opis w stopce (80).
- **Cele < 24 px:** 17 linków tekstowych (nawigacja, stopka) ma 19 px wysokości. **Spełniają wyjątek odstępu z 2.5.8** (koło 24 px nie zachodzi na inne cele). Tagi mają 30 px, zakładka 36 px, ikony społecznościowe 38 px.
- **Kolor jako jedyny nośnik stanu:** aktywną zakładkę wyróżniają tylko tło i kolor tekstu, bez `role="tab"` i `aria-selected`. Różnica jasności jest duża, więc to przypadek graniczny (przypuszczenie). Zapisana oferta zmienia wypełnienie ikony, ale nie ma `aria-pressed`.
- **Komunikaty błędów:** strona nie ma własnych komunikatów. Jest tylko natywna walidacja e-maila, a komunikat Chrome mówi, co poprawić. W obecnej formie znak nie występuje.
- **Kontrast elementów interfejsu:** ramka wyszukiwarki i przycisku zakładki `#e5e7eb` na bieli ma 1,24 : 1. Wyszukiwarkę wyróżnia też cień, ikona zakładki ma 4,83 : 1.
- **Lead w hero:** w najgorszym punkcie 4,55 : 1 — przechodzi na granicy.
- **Nagłówki:** po h1 od razu h4 (karta w hero, :911), w stopce h5.
- **Inne:** `scroll-behavior: smooth` bez `prefers-reduced-motion`; 38 atrybutów `style=""`; h2 sekcji pracodawców ma wklejone inline style, które powtarzają `.section-head h2` (:1243).

## 3. Liczby

| Miara | Wynik |
|---|---|
| Kolory tekstu widoczne przy 1440 px | **8** na pierwszym ekranie (7 + placeholder `#757575`; gradient liczony raz); **14** na całej stronie (plus biel z opacity 0,9 w CTA) |
| Rozmiary fontu widoczne przy 1440 px | **7** na pierwszym ekranie (13, 14, 15, 16, 19, 22, 56); **13** na całej stronie (12–20 co 1 px, 22, 40, 44, 56). W kodzie jest 16 (dochodzą 30, 36 i 46 z media queries) |
| Promienie zaokrąglenia w kodzie | **8** (8, 10, 12 — też jako `--radius`, 16, 20, 24 px, 50%, 999 px) + `rx` 2 i 5 w SVG ikon |
| Odstępy (padding/margin/gap) | **24** unikalne wartości niezerowe (2–120 px); **7 spoza siatki 4 px**: 2, 3, 5, 6, 10 (7 miejsc), 14 (10 miejsc), 18 px |
| Kolory wpisane na sztywno poza `:root` | **50** unikalnych, **99** wystąpień. 5 z nich to kopie istniejących tokenów, które je omijają: `#4f46e5`, `#eef2ff`, `#06b6d4`, `#f59e0b`, `#111827`. Klas Tailwinda nie ma — strona to czysty CSS |

## 4. Pięć decyzji, żeby interfejs przestał wyglądać jak średnia

1. **Kolor z marki zamiast palety Tailwinda** — *token.* Jeden kolor akcji, neutralne i semantyczne pary tekst/tło (sukces, ostrzeżenie, ocena) dobrane od razu z kontrastem ≥ 4,5 : 1. To usuwa 50 kolorów na sztywno i problemy z zielenią i bursztynem.
2. **Skala typografii, odstępów i promieni** — *token.* 5–6 rozmiarów fontu zamiast 16, odstępy na siatce 4 px, 2–3 promienie. Pigułka tylko tam, gdzie oznacza filtr lub tag.
3. **Karta oferty i wyszukiwarka jako prawdziwe komponenty** — *komponent.* Etykiety pól, widoczny fokus, karta jako link, stany wyników, pustki, ładowania i błędu. Wyszukiwarka z wynikami zastępuje w hero pływające makiety.
4. **Każda liczba, opinia i logo ma źródło w danych produktu** — *zasada.* Bez źródła nie pojawia się na stronie. Wartości pochodne (paski lejka, sumy kategorii, „ponad X”) liczy się z jednego źródła, więc nie mogą sobie przeczyć.
5. **Treść działa bez JS i bez ruchu** — *zasada.* Domyślnie wszystko jest widoczne; animacje odsłaniania, liczniki i „float” to dodatek za `prefers-reduced-motion: no-preference`. Gradient wyłącznie dekoracyjnie, nigdy pod tekstem.
