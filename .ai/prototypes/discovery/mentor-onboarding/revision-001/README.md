# Prototyp discovery: onboarding mentora — rewizja 001

- Brief: `.ai/specs/product-brief.md` (2026-10-18), sekcja Key flows → „Future state 1.0 (mentor)”
- Przepływ: zaproszenie → profil (R10) → cena w widełkach (R08) → terminy (R01) → zgoda na katalog lub nie (R11) → publikacja i link mentora
- Data rewizji: 2026-10-20; poprzednia rewizja: brak
- Raport panelu syntetycznego: **nie podano** — prototyp powstał bez panelu, więc nie ma tu sugestii `[SYNTHETIC]`
- Kontekst pomocniczy: `lekcja-07/mapa-ekranow.md` (mapa E01, zatwierdzona 2026-10-20) — stany s08 i s13 i ich teksty; backlog E02 (#21–#24) w `.ai/specs/backlog.md`

To prototyp z **fikcyjnymi danymi**. Nie jest dowodem z badań, nie potwierdza popytu ani podaży (A01) i nie spełnia Definition of Ready. Nie jest też projektem wizualnym.

## Jak uruchomić

Otwórz `index.html` w przeglądarce (działa z `file://`, bez sieci). Stan żyje tylko w pamięci karty. „Resetuj symulację” w panelu „Stan testowy” przywraca początek (zaproszenie nieprzyjęte, puste formularze, wyłączone przełączniki). Przeładowanie strony robi to samo.

## Granice symulacji (zatwierdzone przez Natalię 2026-10-20)

- **Aktor:** zalogowana osoba z kontem mentee („Ola Testowa”, `ola.testowa@example.test`), która dostała zaproszenie operatora.
- **Start:** ekran zaproszenia (s08, zalogowany wariant „Przyjmij zaproszenie”).
- **Sukces:** profil opublikowany, cena w widełkach, co najmniej jeden termin, decyzja o katalogu (domyślnie „nie”), link mentora do skopiowania.
- **Struktura (wybór Natalii):** panel `/mentor` z checklistą czterech zadań w dowolnej kolejności — nie kreator.
- **Publikacja (wybór Natalii):** link pokazuje profil dopiero po kliknięciu „Opublikuj profil”.
- **Terminy (wybór Natalii):** pojedyncze terminy (data, godzina, 25/50 min), bez powtarzalnej dostępności.
- **Poza prototypem (oznaczone w interfejsie albo pominięte):** Stripe Connect (R15 — tylko informacja tekstowa), widok profilu oczami mentee, katalog po stronie mentee, panel operatora i edycja widełek, rezerwacja, konto i wylogowanie, logowanie/rejestracja gościa z zaproszenia (to pokrywa prototyp E01).

Potwierdzenie granic zatwierdza symulację i jej założenia, a nie prawdziwość tych założeń.

## Zachowane reguły i decyzje

| Id | Jak prototyp go zachowuje | Status / właściciel |
|---|---|---|
| R01 / D03 | Terminy i ceny tylko dla 25 i 50 min | active, Natalia |
| R08 / D08 | Mentor ustawia cenę sam; walidacja widełek przy zapisie | active, Natalia |
| R18 / D17 | Widełki 25 min 80–215 PLN, 50 min 150–430 PLN | active, Natalia |
| R18 / D19 | Stan testowy „Operator zmienił widełki”: cena spoza nowych widełek zostaje ważna, mentor widzi ostrzeżenie w panelu i na ekranie ceny; nowa edycja musi się zmieścić w widełkach | active, Natalia |
| R09 / D08 | Pod polem ceny kwota po prowizji 20% (zob. A-04) | active, Natalia |
| R10 / N02 | Profil = link do publicznej pracy + opis; brak ocen gdziekolwiek | active, Natalia |
| R11 / D04 | Katalog domyślnie „nie”; link działa niezależnie od katalogu | active, Natalia |
| R14 / D16 | Link mentora ma parametr źródła (`?src=link`, format: A-06) | active, Natalia |
| R15 / D10 | Dane do wypłat dopiero po pierwszej rezerwacji — tylko tekst, bez ekranu | active, Natalia |
| R21 / D18 | Rola mentora tylko z zaproszenia; bez zaproszenia panel daje „Nie masz dostępu” (s13.1) | active, Natalia |
| R12 / D05 | Żaden tekst nie obiecuje czasu odpowiedzi | active, Natalia |
| R16 / D15 | Użyte pośrednio w A-03 (termin < 2 h od teraz) | active, Natalia |

Zmiana którejkolwiek z nich wymaga rekordu zastępującego zatwierdzonego przez Natalię (ścieżka z briefu). Prototyp żadnej nie zmienia.

## Założenia

Każde jest potrzebne tylko po to, żeby dało się przeklikać przepływ. Żadne nie jest decyzją produktową.

| Id | Założenie | Dlaczego potrzebne | Jak sprawdzić |
|---|---|---|---|
| A-01 `[ASSUMPTION]` | Do „Opublikuj profil” potrzebne są profil, cena (obie długości) i ≥ 1 termin; katalog nie blokuje publikacji | Natalia wybrała jawny przycisk, ale nie warunki | Decyzja Natalii przy spec E02-S01; porównać z D10 |
| A-02 `[ASSUMPTION]` | Mentor podaje cenę obu długości, nawet jeśli oferuje tylko jedną | Brief nie mówi, czy mentor może oferować jedną długość | Pytanie w deklaracjach etapu 1 (D09) albo decyzja w spec E02-S02 |
| A-03 `[ASSUMPTION]` | Nie da się dodać terminu zaczynającego się < 2 h od teraz (bo R16 i tak blokuje jego rezerwację) | Inaczej mentor publikowałby terminy niemożliwe do zarezerwowania | Decyzja w spec E02-S03 |
| A-04 `[ASSUMPTION]` | Mentor widzi kwotę po prowizji 20% przy ustawianiu ceny | R09 jest regułą, ale jej pokazywanie mentorowi nie jest decyzją | Decyzja w spec E02-S02 |
| A-05 `[ASSUMPTION]` | Terminy nie mogą na siebie nachodzić | Brief milczy; bez tego mentor mógłby mieć dwie sesje naraz | Decyzja w spec E02-S03 |
| A-06 `[ASSUMPTION]` | Kształt linku `https://devmentor.example/m/<slug>?src=link`, slug z nazwy | R14 wymaga parametru źródła, nie mówi o formacie | Spec E02-S01 / E03-S01 |
| A-07 `[ASSUMPTION]` | Opis profilu do 1000 znaków; link musi zaczynać się od `https://` | Potrzebny limit do walidacji; brief nie podaje | Spec E02-S01 i `db/src/constants.ts` |
| A-08 `[ASSUMPTION]` | Po publikacji i usunięciu wszystkich terminów profil zostaje opublikowany, panel ostrzega „nikt nie może teraz zarezerwować” | Brief nie mówi o wycofaniu publikacji | Decyzja: czy jest „Ukryj profil” i co wtedy z linkiem |
| A-09 `[ASSUMPTION]` | Brak wycofania publikacji i brak usuwania profilu w prototypie | Nie ma tego w briefie ani backlogu | Jak A-08 |
| A-10 `[ASSUMPTION]` | Czas terminów w strefie Europe/Warsaw; „teraz” zamrożone na wt 20.10.2026, 10:00 | Deterministyczna walidacja „< 2 h” | Spec E02-S03 (strefy czasowe) |
| A-11 `[ASSUMPTION]` | Każdy zapis (profil, cena, termin, katalog, publikacja) to osobna akcja z możliwym błędem 503 i ponowieniem; dane zostają w formularzu | Wymagany stan błędu i odzyskania | Zgodne z `apiHandler`/`CrudForm`; potwierdzić w spec |

Otwarte pytania z briefu, które dotykają tego przepływu: Q11 (filtry technologii w katalogu — profil w prototypie nie ma technologii), Q09 (regulamin — mentor nie akceptuje żadnych warunków w prototypie).

## Mapa ekranów i stanów

| Id (fragment) | Ekran / stan | Akcja | Następny stan | Reguły / założenia |
|---|---|---|---|---|
| `#invite` | Zaproszenie (s08.2) | „Przyjmij zaproszenie” → „Przyjmowanie…” | `#panel` z komunikatem „Masz rolę mentora…” | R21, D18 |
| `#invite` + „Zaproszenie nieważne” | s08.6 | — | Komunikat i kontakt z osobą zapraszającą | mapa E01 L15/L17 |
| `#invite` po przyjęciu | s08.5 „Masz już rolę mentora” | link | `#panel` | mapa E01 |
| `#forbidden` | s13.1 Brak dostępu | wejście na `#panel`/`#profile`/… bez roli | „Wróć do zaproszenia” | R21 |
| `#panel` | Checklista: Profil, Cena, Terminy, Katalog + Publikacja | „Opublikuj profil” bez kompletu | Lista braków z linkami, fokus na liście | A-01 |
| `#panel` | Publikacja | „Opublikuj profil” (komplet) → „Publikowanie…” | „Profil opublikowany”, link mentora, „Kopiuj link” | R14, A-06 |
| `#panel` + 503 | Błąd publikacji | ponowne kliknięcie | Opublikowany | A-11 |
| `#panel` + zmienione widełki | Ostrzeżenie D19 | „Edytuj: Cena” | `#price` z ostrzeżeniem | R18, D19 |
| `#panel` opublikowany, 0 terminów | Ostrzeżenie „nikt nie może teraz zarezerwować” | „Edytuj: Terminy” | `#slots` | A-08 |
| `#profile` | Formularz profilu | zapis pusty / zły link → błędy przy polach; poprawny → `#panel` „Profil zapisany” | | R10, A-07 |
| `#price` | Formularz ceny z widełkami i kwotą netto | poza widełkami → błąd; w widełkach → `#panel` „Cena zapisana” | | R08, R18, A-02, A-04 |
| `#slots` | Pusta lista / lista terminów + formularz | braki → błędy; < 2 h → błąd; nachodzi → błąd; poprawny → termin na liście; „Usuń” | | R01, A-03, A-05, A-10 |
| `#catalog` | Zgoda na katalog (domyślnie „Nie”) | „Zapisz decyzję” → `#panel` | | R11, D04 |
| `#notfound` | Nieznany fragment | „Wróć na początek” / „Panel mentora” | | — |
| każdy formularz + 503 | „Nie udało się zapisać. Twoje dane są nadal w formularzu” | ponowny zapis | sukces | A-11 |

## Weryfikacja

Przegląd statyczny (2026-10-20): ✅ brak zewnętrznych skryptów, stylów, fontów, obrazów, `fetch`, storage i ciasteczek; jedyny adres `https://` to tekst przykładowego linku mentora (nie jest linkiem). Formularze mają `preventDefault`. Dane z formularzy trafiają do DOM przez `textContent`. Etykiety pól, błędy przy polach z `aria-invalid` i `aria-describedby`, region `role="status"`, fokus na nagłówku po nawigacji, widoczny obrys fokusu.

Przejście w przeglądarce: `agent-browser` 0.35.2 (binarka z cache zweryfikowana SHA-256, bez instalacji), sesja `proto-mentor-onb`, `file://`. Sesja zamknięta.

| # | Akcja | Oczekiwane | Zaobserwowane | Dowód |
|---|---|---|---|---|
| 1 | Otwarcie | Zaproszenie, „Przyjmij zaproszenie” | ✅ | `evidence/01-zaproszenie.png` |
| 2 | `#panel` bez roli | s13.1, fokus na nagłówku | ✅ `forbidden-h` | — |
| 3 | „Zaproszenie nieważne” | Komunikat s08.6, przycisk ukryty | ✅ | `evidence/02-zaproszenie-niewazne.png` |
| 4 | Przyjmij | „Przyjmowanie…”, potem panel, fokus `panel-h` | ✅ | `evidence/03-panel-start.png` |
| 5 | Opublikuj bez kompletu | Lista: Profil, Cena, Co najmniej jeden termin; fokus na liście | ✅ | `evidence/04-publikacja-braki.png` |
| 6 | Profil pusty → zły link → poprawny | Dwa błędy, fokus na pierwszym; błąd `https://`; zapis i podsumowanie w panelu | ✅ | `evidence/05-profil-bledy.png` |
| 7 | Cena 250/120 → 200/380 | Błędy widełek; kwoty netto 160/304; zapis | ✅ | `evidence/06-cena-poza-widelkami.png` |
| 8 | Terminy: pusta lista, pusty formularz | Stan pusty; trzy błędy | ✅ | `evidence/07-terminy-puste.png` |
| 9 | Termin 20.10 11:00 | Błąd „co najmniej 2 h” | ✅ | `evidence/08-termin-za-wczesnie.png` |
| 10 | 22.10 18:00 50 min | Na liście, formularz wyczyszczony | ✅ | — |
| 11 | 22.10 18:30 25 min | Błąd „nachodzi na inny” | ✅ | `evidence/09-termin-nachodzi.png` |
| 12 | 503 przy 19:00, ponowienie | Błąd, dane zostają, przełącznik zużyty; ponowienie dodaje termin | ✅ | `evidence/10-zapis-nieudany.png` |
| 13 | Katalog „Tak” | Domyślnie „Nie”; po zapisie podsumowanie w panelu | ✅ | — |
| 14 | Opublikuj, Kopiuj link | Link `?src=link`, „Skopiowano”, komunikat w `status` | ✅ (ale błąd: przycisk „Opublikuj” nadal widoczny — zob. niżej) | `evidence/11-opublikowany.png` |
| 15 | Zmienione widełki | Ostrzeżenie D19 w panelu | ✅ | `evidence/12-cena-poza-nowymi-widelkami.png` |
| 16 | Edycja ceny przy nowych widełkach: 200 → 180 | Ostrzeżenie na ekranie ceny; 200 odrzucone; 180 zapisane, ostrzeżenie znika | ✅ | — |
| 17 | Usunięcie wszystkich terminów po publikacji | Pusta lista, fokus na nagłówku listy, ostrzeżenie w panelu | ✅ | `evidence/13-opublikowany-bez-terminow.png` |
| 18 | `#rezerwacje` | „Nie ma takiej strony w prototypie”, wyjścia | ✅ | `evidence/14-nieznany-adres.png` |
| 19 | Wstecz / Wstecz / Dalej | `#panel` → `#slots` → `#panel` | ✅ | — |
| 20 | Tab ×12 | Wszystkie kontrolki osiągalne, obrys `solid` | ✅ | — |
| 21 | Po poprawce: pełna ścieżka, 503 przy publikacji, ponowienie | Przycisk „Opublikuj” znika po publikacji; katalog domyślnie „nie” nie blokuje | ✅ | `evidence/15-opublikowany-po-poprawce.png` |
| 22 | Ekran 375 px | Brak poziomego przewijania (`scrollWidth` 375), wszystkie akcje widoczne | ✅ | `evidence/16-waski-ekran-panel.png`, `evidence/17-waski-ekran-terminy.png` |
| 23 | Resetuj symulację | `#invite`, przełączniki wyłączone, „Symulacja zresetowana”, `#panel` znów daje brak dostępu | ✅ | `evidence/18-po-resecie.png` |

**Naprawione w tej rewizji:** reguła `.actions { display: flex }` nadpisywała atrybut `hidden`, więc „Opublikuj profil” zostawał widoczny po publikacji (zrzut 11 i 12 pokazują stan sprzed poprawki). Dodano `[hidden] { display: none !important; }` i sprawdzono ponownie (krok 21). Linki „Edytuj” dostały etykiety „Edytuj: Profil” itd., żeby czytnik ekranu je rozróżniał.

Kontrast policzony wzorem WCAG dla par z CSS: najsłabsza para `#555` na `#fff` = 7,46:1 (≥ 4,5:1).

**Niesprawdzone:** odczyt przez prawdziwy czytnik ekranu — sprawdzone tylko drzewo dostępności i treść regionu `status`.

Wynik: **passed** — przepływ i stany działają w symulacji. To nie mówi nic o tym, czy mentorzy przejdą onboarding w rzeczywistości.
