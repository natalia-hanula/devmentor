# Referencje: DevMentor

- Data: 2026-10-19
- Kto wybierał: referencje R01, R02, A01 i decyzje bez referencji (W01–W05): Natalia. Propozycje P01–P18 (cechy „nie bierzemy”, antyreferencje z badań, słowa charakteru): Claude, każdą osobno przyjęła Natalia 2026-10-19.
- Zrzuty: brak. Wszystkie obserwacje R01 i R02 to **parafraza bez zrzutu** — opisują ogólnie znany wygląd GitHuba i Slacka, nie konkretny ekran. Decyzja Natalii: zostają parafrazą.
- Słowa charakteru (potwierdzone): **gęsty na listach, spokojny w rozmowie** · **czytelny** · **ciepły** · **bezpośredni** · **jednoznaczny**
- Antycharakter (potwierdzony): **generyczny** (A01) · **efekciarski** (A01) · **hałaśliwy** (R02, niechęć do powiadomień i emoji) · **bezbarwny** (R01, „wszystko szare”) · **szkolny** (AR02, z badań)

## Referencje

| # | Referencja | Źródło | Kto wybrał | Obserwacja | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status (propozycja / przyjęte) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.1 | GitHub — lista PR i strona repo | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Jeden wiersz to jedna pozycja: tytuł w pierwszej linii, pod nim jedna linia metadanych (numer, autor, czas) mniejszym, przygaszonym tekstem. Na jednym ekranie kilkanaście wierszy bez przewijania. | Gęste listy w panelach, które da się przejrzeć wzrokiem. | Gęstości na ekranie sesji (zob. K1). | — | Mentor przegląda rezerwacje z opisem problemu (R04), mentee — terminy; obie strony to programiści, którzy czytają ten układ codziennie. | kompozycja i gęstość | musi być | przyjęte |
| R01.2 | GitHub | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Kod, nazwy plików i gałęzi w foncie o stałej szerokości; reszta interfejsu w foncie proporcjonalnym. | Monospace dla kodu i nazw plików; Natalia rozszerza to na ceny (W03). | Monospace w tekście interfejsu. | — | Mentee wkleja kod i konfigurację („wkleję yamla”, 2026-09-01); zaufanie budują konkrety typu „ingress-nginx 1.28”; ceny mentee chce znać, „zanim cokolwiek napiszę” (2026-09-02). | typografia | musi być | przyjęte |
| R01.3 | GitHub | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Wiersze listy rozdzielone cienką poziomą linią, bez kart, cieni i tła wiersza. | Cienkie linie jako separator wierszy na listach w panelach. | Linii między wiadomościami w sesji (zob. K2). | — | Uzasadnienie produktowe słabe — to przede wszystkim gust; wspiera gęstość z R01.1 bez dodatkowych kontenerów. | komponenty | musi być | przyjęte |
| R01.4 | GitHub | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Tła, linie i tekst pomocniczy w chłodnych, neutralnych szarościach; mało koloru poza statusami. | — | Chłodnych szarości („wszystko szare, mało ciepła”). | Szarości z lekko ciepłym podtonem w tłach, liniach i tekście pomocniczym (decyzja Natalii, bez referencji, pyt. 2). | Brak związku z produktem — to gust, zapisany otwarcie jako decyzja Natalii. | kolor | musi być | przyjęte (P01) |
| R01.5 | GitHub | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Na liście PR i stronie repo tytuł PR ma ten sam ciężar wizualny co metadane; wiele elementów o podobnej wadze (pyt. 3). | — | Równego ciężaru wszystkich elementów („trudno się zorientować, co najważniejsze”). | Na każdym ekranie jeden element główny, wyróżniony wielkością albo kolorem akcji (W01); reszta przygaszona. | Rezerwacja ma zająć mniej niż 5 minut (A05, „jak booking trwa więcej niż pięć minut to robię rollback”), więc następny krok musi być widoczny od razu. | kompozycja i gęstość | musi być | przyjęte (P02) |
| R01.6 | GitHub | karta R01, zrzut: brak | Natalia | (parafraza, brak zrzutu) Na stronie repo liczniki gwiazdek, forków i obserwujących jako sygnał popularności. | — | Liczników popularności. | Profil mentora pokazuje link do publicznej pracy i opis tego, co robił (R10). | N02 (bez ocen); zaufanie z publicznej pracy wybrało 41 z 54 w ankiecie, oceny 12 z 54. | komponenty | musi być | przyjęte (P03) |
| R02.1 | Slack — kanał z wątkiem | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Wiadomości w jednej kolumnie wyrównanej do lewej, bez dymków; rozmowa zajmuje środek ekranu; wiadomości rozdzielone odstępem, nie linią (do potwierdzenia zrzutem). | Układ ekranu sesji: rozmowa w centrum, odstępy między wiadomościami. | — | — | Tekstowy ekran sesji w DevMentorze to rdzeń 1.0 (D14, R19). | kompozycja i gęstość | warto | przyjęte |
| R02.2 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Nagłówek każdej wiadomości: awatar, nazwa autora, godzina. | Autor i czas przy każdej wiadomości. | — | — | R20 liczy nieobecność i sesję odbytą z wiadomości stron w oknie slotu — „kto i kiedy” wpływa na zwrot i wypłatę. | komponenty | warto | przyjęte |
| R02.3 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Pole pisania przypięte na dole widoku; wysłana wiadomość pojawia się w rozmowie od razu, bez przeładowania. | Szybkie pisanie i odpisywanie. | — | — | Okno sesji to 25 lub 50 min, potem ekran jest tylko do odczytu (R19). | komponenty; ruch i reakcja | warto | przyjęte |
| R02.4 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Plakietki z licznikami nieprzeczytanych, wzmianki, powiadomienia z wielu kanałów. | — | Powiadomień o wszystkim („za dużo powiadomień”). | Powiadomienia tylko o zdarzeniach rezerwacji i sesji: nowa rezerwacja, odwołanie, start sesji. | Mentor chce „nie tracić czasu” (2026-09-03); produkt to pojedyncze sesje, nie strumień rozmów. | ruch i reakcja | warto | przyjęte (P05) |
| R02.5 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Reakcje emoji pod wiadomościami i emoji w treści. | — | Emoji („emoji wszędzie”). | Bez reakcji emoji w sesji i bez emoji w interfejsie; ton jak W04. | Sesja to płatna konsultacja techniczna; rzeczowy ton wspiera „bezpośredni”. | ton wypowiedzi | warto | przyjęte (P06) |
| R02.6 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) Boczny pasek z listą kanałów, wiadomości prywatnych i sekcji. | — | Paska bocznego z listą rozmów („bałagan w bocznym pasku”). | Ekran sesji bez paska z listą rozmów: jedna sesja, jedna rozmowa, opis problemu jako zwarty nagłówek. | Jedna sesja dotyczy jednego problemu (R04); mentor widzi opis przed i w trakcie. | kompozycja i gęstość | warto | przyjęte (P07) |
| R02.7 | Slack | karta R02, zrzut: brak | Natalia | (parafraza, brak zrzutu) W domyślnym motywie boczny pasek ma nasycony fioletowy kolor (do potwierdzenia zrzutem). | — | Fioletowego paska — za blisko fioletu z AR01. | Kolory z R01.4 i W01. | Brak związku z produktem — odrzucenie wynika z AR01. | kolor | warto | przyjęte (P04) |
| W01 | — (decyzja bez referencji) | Natalia, pyt. 2 | Natalia | — | Jeden stonowany kolor akcji. | Kilku kolorów akcentu. | — | Nośnik „jednej głównej rzeczy na ekranie” (R01.5). | kolor | — | przyjęte |
| W02 | — (decyzja bez referencji) | Natalia, pyt. 5a | Natalia | — | Jeden czytelny krój do całego UI; monospace tylko dla kodu, nazw plików i cen. | Drugiego kroju do nagłówków. | — | Spójne z R01.2; ceny w monospace — mentee chce znać cenę przed rezerwacją (R08). | typografia | — | przyjęte |
| W03 | — (decyzja bez referencji) | Natalia, pyt. 5b | Natalia | — | Minimum: krótkie przejścia. | Animacji ozdobnych. | — | Wspiera szybkość (R02.3, A05). Rodzina poza tym otwarta (zob. Luki). | ruch i reakcja | — | przyjęte (minimum) |
| W04 | — (decyzja bez referencji) | Natalia, pyt. 5c | Natalia | — | Ton konkretny i rzeczowy jak komunikat w PR: co się stało i co zrobić. | Wykrzykników i obietnic. | — | R12: 1.0 nie obiecuje czasu odpowiedzi; mentor podejrzliwy wobec sprzedaży („to jest coś sprzedażowego?”, 2026-09-03). | ton wypowiedzi | — | przyjęte |
| W05 | — (decyzja bez referencji) | Natalia, pyt. 5d | Natalia | — | Strona mentora z linku: ta sama typografia i kolory co panel, luźniejszy układ. | — | — | Link mentora to główne wejście (D04). Zasada tymczasowa do mockupów (zob. Luki). | kompozycja i gęstość | — | przyjęte (tymczasowo) |

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło (gust / badania / propozycja) |
|---|---|---|---|---|
| AR01 | Typowa strona startupu AI + generyczny wygląd AI (A01 połączona z generycznym wyglądem AI) | „Wygląda jak wszystko inne” (Natalia). Domyślny motyw shadcn dotyczy nas wprost, bo panele są na shadcn, i pokrywa się z „wszystko szare” z R01. | Na ekranie: fioletowy gradient w tle lub na przyciskach; szklane karty (półprzezroczyste tło, rozmycie, jasna obwódka); iskierki przy funkcjach; tekst z gradientem; siatka trzech kart funkcji z ikonami; nagłówki typu „Supercharge your…”; neonowy blask w trybie ciemnym; niezmieniony domyślny motyw shadcn (szarości slate/zinc, domyślny font). W kodzie: `bg-gradient-to-*` z `purple`/`violet`/`fuchsia`, `backdrop-blur`, `bg-white/10`, `bg-clip-text text-transparent`, ikona `Sparkles`, domyślne zmienne motywu shadcn bez zmian. | gust (A01: gradient, szkło, iskierki) + propozycja przyjęta (P08, P09) |
| AR02 | Kurs / ścieżka nauki | Mentee chce odpowiedzi, nie nauki. | Paski postępu, certyfikaty, odznaki, „mentorship journey”, serie dni, moduły i lekcje. | badania: „I don't want a course, I want an answer” (2026-08-20), „nie chcę się uczyć helma” (2026-09-01), „mentorship journey lol” (2026-09-02); propozycja przyjęta (P10) |
| AR03 | Marketplace z gwiazdkami | Oceny nie niosą informacji i odstraszają mentorów; N02. | Gwiazdki, średnie ocen (4.9, 5.0), liczba recenzji, odznaki „top mentor”. | badania: „każdy ma pięć gwiazdek” (2026-09-01), „kazdy ma 4.9” (2026-09-02), „byłam oceniana” (2026-09-03), ankieta 12/54; propozycja przyjęta (P11) |
| AR04 | Subskrypcja / community | Odrzucone przez mentees; N03. | Plany miesięczne, „dołącz do społeczności”, feed, licznik członków. | badania: „jak to subskrypcja, to nie otworzę drugi raz” (2026-09-02), „community” jako niepotrzebne (2026-09-01, 2026-09-02); propozycja przyjęta (P12) |
| AR05 | Tytuł zamiast pracy | Zaufanie buduje konkretna wykonana rzecz, nie staż. | Nagłówek profilu = stanowisko + lata doświadczenia + logotypy firm, zamiast linku do publicznej pracy i opisu konkretnego problemu. | badania: „nie senior engineer tylko robiłem upgrade ingress-nginx na 1.28” (2026-09-01), „nie 10 lat reacta” (2026-09-02); propozycja przyjęta (P13) |
| AR06 | Fałszywa pilność | 1.0 nie obiecuje czasu odpowiedzi (R12). | Plakietki „dostępny teraz”, „odpowiada w <1h”, liczniki odliczające. | brief: R12, A03; propozycja przyjęta (P14) |
| AR07 | Katalog jako porównywarka obcych | Mentorzy nie chcą stać na liście obok nieznajomych; link przed katalogiem (D04). | Ranking i siatka kart mentorów jako główne wejście, porównywanie kart obok siebie. | badania: „nie wsadzajcie mnie na listę obok ludzi, których nie znam” (2026-09-03); brief D04; propozycja przyjęta (P15) |
| AR08 | Długi kreator rezerwacji | Rezerwacja ma zająć < 5 min (A05). | Wiele ekranów i kroków rezerwacji, pasek kroków „1 z 5”. | badania: „jak booking trwa więcej niż pięć minut to robię rollback” (2026-09-01); propozycja przyjęta (P16) |

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| K1: dużo informacji na ekranie vs rozmowa w centrum | R01.1, R02.1 | Gęstość z R01 na listach w panelach; układ R02 na ekranie sesji. Słowo charakteru: „gęsty na listach, spokojny w rozmowie”. | Natalia (pyt. 4, P17) |
| K2: cienkie linie między wierszami vs odstępy między wiadomościami | R01.3, R02.1 | Linie na listach w panelach; odstępy na ekranie sesji. | Natalia (pyt. 4) |
| K3: gęstość vs brak hierarchii w tej samej referencji | R01.1, R01.5 | Gęste listy, ale jeden element główny na ekranie. | Natalia (pyt. 3, P02) |
| K4: fioletowy pasek Slacka vs fiolet z antyreferencji | R02.7, AR01 | Nie bierzemy koloru ze Slacka. | Natalia (P04) |
| K5: nasz stack (shadcn) a domyślny motyw shadcn jako generyczny wygląd | AR01, R01.4 | Domyślny motyw shadcn trafia do podpisu AR01; panele dostają własne kolory i krój. | Natalia (P09) |

## Luki

- **Zrzuty:** brak dla R01 i R02 — obserwacje są parafrazą. Do potwierdzenia na zrzucie: odstępy zamiast linii w Slacku (R02.1), fioletowy pasek (R02.7).
- **Kolor:** żadna referencja nie pokazuje pozytywnie palety. Nieznane: który kolor akcji (W01), jak mocny ciepły podton szarości (R01.4), czy i jak wygląda tryb ciemny.
- **Typografia:** zasada jest (W02), ale bez konkretnego kroju UI ani kroju monospace.
- **Ruch i reakcja:** otwarta luka; ustalone tylko minimum (W03).
- **Strona mentora z linku:** otwarta luka do uzupełnienia przy mockupach; do tego czasu W05.
- **Katalog opt-in (R11):** wiemy, czego unikać (AR07), nie ma pozytywnej referencji dla karty mentora w katalogu.
- **R01.3:** uzasadnienie produktowe słabe — to głównie gust.

## Obrazy

Brak — zrzutów nie dostarczono (decyzja Natalii, 2026-10-19). Jeśli się pojawią, trafią obok tego pliku jako np. `R01-lista-pr.png`, `R01-strona-repo.png`, `R02-kanal-z-watkiem.png`.

---

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym kroku, z tego pliku, i każdą z nich Natalia zatwierdza osobno.
