# DevMentor — product brief

- Date: 2026-10-18
- Mode: own; Owner: Natalia (właścicielka zakresu w repo, D02); Pass: full
- Evidence basis: 7 rozmów z różnymi osobami (3 mentees z blokerem, 1 platform dev bez problemu, 3 seniorów-mentorów; 2026-08-20 – 2026-09-03); 5 z nich ma surowe notatki founderów poprzedniego zespołu, notatki z 2026-08-20 i 2026-08-22 to same podsumowania bez prowadzącego i metody; eksport z Discorda (109 wątków, 2026-08-18 – 2026-08-31) i anonimowa ankieta (54 odpowiedzi) pochodzą z jednej społeczności i od jednej osoby (founder B, moderator), która też nadała etykiety tematu i rozwiązania — traktować jako jedno źródło; 5 benchmarków sprawdzonych 2026-09-04; lista 50 mentorów (nikt nie kontaktowany). Ankieta mierzy deklaracje, nie płatności. Zakres 1.0 i kryteria testów to decyzje Natalii (D01–D16). Najbardziej konsekwentne niesprawdzone przekonanie: że zaproszeni mentorzy opublikują rezerwowalne terminy (A01) i że mentees faktycznie zapłacą (A02).
- Coverage: 71 claims — 63 sourced (interview 10, data 5, document 46, product 1, benchmark 1), 0 synthetic, 8 assumed; 2 entries on the collection plan (stan przed D17–D23; do przeliczenia przy `om-discover --refresh`)
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: Natalia, 2026-10-18 (zatwierdzenie briefu); ready for: etap 1 testu podaży (D09) oraz planowanie implementacji zakresu 1.0 — blokery backlogu rozstrzygnięte 2026-10-18 (D17–D23, w tym widełki cen Q01); budowa przed wynikiem etapu 1 to świadomie przyjęte ryzyko (D09); pomiar popytu z prawdziwymi płatnościami czeka na regulamin (Q09)
- Sources: `.ai/specs/research/` (rozmowy `2026-08-20-*`, `2026-08-22-*`, `2026-09-0[1-3]-interview-*`; dane `2026-09-04-discord-help-requests.csv`, `2026-09-04-data-request-discord-help.md`, `2026-09-04-survey-discord-willingness-to-pay.md`; benchmarki `2026-09-04-benchmark-*.md`; lista `2026-09-04-mentor-list*.{csv,md}`; warsztat `2026-08-26-workshop-export.md`; tablica `2026-09-0*-miro-board-*.md`), `.ai/specs/research/decisions/`

## Decision summary

Decyzja: zakres pierwszej wersji (1.0, budżet 25 h) to płatna, tekstowa sesja 25 lub 50 min u seniora, który rozwiązywał ten sam problem. Skarbiec notatek, subskrypcja i MCP przechodzą na później. Test podaży mentorów ma dwa etapy: deklaracje przed budową i prawdziwe terminy po starcie (D09). Decyzje przyjęte przez Natalię (D01, D09).

Problem ma oparcie po stronie mentee: trzech programistów bez seniora pod ręką opisało utknięcie na konkretnym blokerze, szukanie samemu, pytanie na Discordzie i koszt od pół dnia do tygodnia; w eksporcie Discorda 21% wątków nie dostało żadnej odpowiedzi, a z 31 pilnych 8 skończyło się rozwiązaniem (zob. Problems). Po stronie mentora: seniorzy odpowiadają na te same pytania za darmo z prywatnego dokumentu i chcą, żeby te notatki zarabiały bez calla. 1.0 daje im tylko płatne sesje, więc test podaży sprawdza ofertę słabszą niż ta, którą opisali (D01, A01). Po stronie mentee subskrypcję odrzuciło 3 z 4 rozmówców, zapisane odpowiedzi 2 z 4; nikogo nie pytano o płacenie za cudze notatki — skarbiec przechodzi na później.

1.0: mentor dostaje link ze śledzeniem źródła, ustala cenę w widełkach operatora i publikuje terminy; mentee zakłada konto, rezerwuje termin (najpóźniej 2 h przed startem) z opisem problemu i płaci z góry; mentor może odwołać przed startem (pełny zwrot); sesja tekstowa odbywa się na ekranie sesji w DevMentorze. Bez wideo, bez ocen, katalog tylko dla mentorów, którzy się zgodzą (Scope, R01–R17, N01–N04, D03–D16).

Największa niezgodność: mentees opisywali potrzebę „w dwadzieścia minut”, „within the hour”, „tego samego dnia”, a przypadek wyceny wymagał rozmowy, nie tekstu — 1.0 obsłuży najwyżej 2 z 3 opisanych przypadków i żadnego w ich czasie. 1.0 to rezerwacja terminu bez obietnicy czasu odpowiedzi (D05), najwcześniej 2 h przed startem (R16), z wymaganym kontem (R17) — dev z fintechu nie chciał zakładać konta i dawał rezerwacji 5 minut (A05). Czy to wystarczy w pilnej sytuacji, jest niesprawdzone (A03). Podaż jest niezmierzona — nikt z listy 50 nie został zaproszony (A01). Chęć zapłaty to deklaracje dotyczące odpowiedzi tekstowej w ciągu godziny: 37 z 54 zapłaciłoby „coś”, 3 kiedykolwiek komuś zapłaciło; o rezerwacji terminu bez obietnicy czasu ankieta nic nie mówi (A02). Kryteria zatrzymania są ustalone dla podaży i popytu (Kill criteria, D09–D11) — to progi wybrane przez Natalię, nie pomiary. Budowa 1.0 idzie równolegle z etapem 1, zanim wiadomo, czy mentorzy się zgłoszą: świadome ryzyko (D09).

Następny krok: Natalia przygotowuje tekst zaproszenia i wysyła go 20 pierwszym mentorom z prośbą o deklarację ceny, okna dostępności i zgody na katalog; ocena po 2 tygodniach — co najmniej 5 deklaracji albo wstrzymanie i rozmowy z odmawiającymi (D09; data otwarta). Widełki cen: 25 min 80–215 PLN, 50 min 150–430 PLN, w konfiguracji operatora (D17, Q01 zamknięte). Regulamin (Q09) jest poza 1.0 kursowym, ale bez niego nie da się przyjmować prawdziwych płatności, więc kryteria popytu (D11) nie mogą zostać zmierzone.

## Vision

Kierunek zespołu (nie wykazana korzyść): programista utknięty na konkretnym problemie dostaje odpowiedź od kogoś, kto rozwiązał to samo, a senior zarabia na wiedzy bez zostawania konsultantem; skarbiec notatek („mentors earn twice”) to wizja poprzedniego zespołu odłożona na później. `[DOCUMENT]` D01; `2026-09-02-miro-board-vision-target-needs.md`

## Target group and stakeholders

- Customer (pays): mentee płacący z własnej kieszeni — w ankiecie 24 z 54 wskazało siebie, 13 pracodawcę „jeśli poproszę”, 6 pracodawcę bez pytania, 9 „nikt”. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`
- Customer (pays), relacja: freelancer zapłaciłby sam („poniżej 200 to tak, z wlasnego”); dev z fintechu wahał się („sam bym zapłacił. chyba”); platform dev płaci tylko „na firmę”. `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-platform-dev-solves-alone.md`
- User (mentee): pracujący programista lub freelancer z konkretnym blokerem i bez seniora do zapytania — opisany przez trzy osoby (TypeScript przed releasem, upgrade Helma w piątek, wycena migracji do server components). `[INTERVIEW]` `2026-08-20-interview-working-dev.md`, `2026-09-01-*`, `2026-09-02-interview-freelancer-react.md`
- Nie-user: programista w dużej firmie z wewnętrznym kanałem pomocy — „kogo. to mnie pytają”, zapłaciłby „raz w roku może”. `[INTERVIEW]` `2026-09-02-interview-platform-dev-solves-alone.md`
- User (mentor): senior, który już odpowiada na pytania w DM/Slacku/Discordzie za darmo i chce kontroli nad tym, kto pyta, ceną i publikacją. `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`
- Pula mentorów: 50 nazwisk z beachheadu TS/React/Python/AI agents; publiczna praca znaleziona u 33, ciepły kontakt do 29, nikt nie zaproszony. `[DATA]` `2026-09-04-mentor-list.csv`, `2026-09-04-mentor-list-note.md`
- Stakeholders: operator (ustala widełki cen, rozlicza zwroty i wypłaty) — Natalia; Stripe jako dostawca płatności; rola prawna (regulamin) bez właściciela. `[DOCUMENT]` D08, D03; `2026-09-05-miro-board-raci-matrix.md`
- Decider for scope decisions: Natalia (D02).

## Problems, with evidence

- Mentee utknięty bez seniora traci czas na samodzielne szukanie i fora: pół dnia i kod, któremu nie ufa (2026-08-20); godzina szukania, zła odpowiedź z Discorda w sobotę, rollback i przesunięty release (2026-09-01); dwa wieczory czytania i wycena zaniżona o ok. tydzień nieopłaconej pracy (2026-09-02; do wyceny ta osoba chce rozmowy — „do wyceny rozmowa” — czego 1.0 nie oferuje, N01). Każdy przypadek to jedna osoba i jedno zdarzenie; częstotliwość u tych osób nieznana. `[INTERVIEW]` `2026-08-20-*`, `2026-09-01-*`, `2026-09-02-interview-freelancer-react.md`
- W #help-* jednego Discorda (~4000 osób) w 14 dni: 109 wątków; 23 bez żadnej odpowiedzi; mediana czasu do pierwszej odpowiedzi 67 min (86 odpowiedzianych); 35 zakończonych „rozwiązane”, 20 częściowo. `[DATA]` `2026-09-04-discord-help-requests.csv` (przeliczone 2026-10-18; odczyt founder B podaje 68 min i 23 częściowe)
- 31 wątków miało sygnał pilności („release tomorrow”, „prod is down”); 9 bez odpowiedzi, 8 rozwiązanych. `[DATA]` `2026-09-04-discord-help-requests.csv`
- W ankiecie 30 z 54 osób utknęło „w tym tygodniu” lub „w tym miesiącu”; najczęstsze reakcje: szukanie (49), AI (38), społeczność (31); komuś zapłaciło 3. `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`
- Mentor odpowiada na te same pytania za darmo, wklejając z prywatnych notatek: „dwa wieczory w miesiącu, za darmo” (2026-08-22); „co tydzień… te same trzy pytania”, nigdy płatnie, „faktury. nie” (2026-09-03). `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`
- Dwie osoby z listy mentorów wskazały, co je zniechęca do istniejących platform: miesięczna relacja („nie chcę relacji”), lista obok nieznajomych, oceny. `[INTERVIEW]` `2026-09-03-interview-staff-engineer-declined-before.md`, `2026-09-03-interview-senior-python-meetups.md`
- Interpretacja, nie obserwacja: że problem jest częsty u jednej osoby, a nie jednorazowy — nikt nie podał częstotliwości („ciągle” nie zostało skwantyfikowane). `[ASSUMPTION]` zob. Q05

## Product and how it stands out

- What it is: rezerwacja płatnej, tekstowej sesji 25/50 min u seniora z linkiem do publicznej pracy, z opisem problemu w formularzu (Scope). `[DOCUMENT]` D01, D05
- Najbliższy konkurent: Codementor sprzedaje już krótkie, płatne sesje na jeden problem programistom. Różnice 1.0 wobec niego: tekst zamiast calla, brak ocen, link mentora jako główne wejście; wobec MentorCruise — brak miesięcznej relacji; wobec Topmate — produkt tylko dla programistów. `[BENCHMARK]` tabela niżej
- To, że te różnice przyciągną obie strony, jest hipotezą. `[ASSUMPTION]` A01, A02

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | ścieżka zgłoszenie → sesja na żywo; stawki $15–$80 / 15 min na kartach | sesja przez call, nic nie zostaje; 10 z 10 kart z oceną 5.0 | 2026-09-04 | https://www.codementor.io/react-experts |
| MentorCruise | darmowa rozmowa wstępna; od $100/mies. | miesięczna relacja, odrzucona przez staff engineer (2026-09-03) | 2026-09-04 | https://mentorcruise.com/ |
| Topmate | strona eksperta „z jednego linku”; prowizja 10% z własnego linku, 20% z marketplace'u | dowolna profesja; obcy nie znajdzie eksperta | 2026-09-04 | https://topmate.io/pricing |
| Preply | sesje 25/50 min; bezpłatne odwołanie do 12 h przed | model cykliczny; oceny na każdej karcie | 2026-09-04 | https://preply.com/en/how-it-works |
| ADPList | rezerwacja „w minutach”; liczba sesji jako sygnał zaufania | darmowe, mentor nie zarabia; głównie design i produkt | 2026-09-04 | https://adplist.org/ |

## Goals and success criteria

- Business goal: sprawdzić, czy mentorzy z listy staną się realnymi mentorami (D10) i czy mentees zapłacą za sesje (D11); cele z tablicy (100 mentorów ze skarbcami, 30% subskrypcji) dotyczą skarbca i nie są przyjęte dla 1.0. `[DOCUMENT]` D01, D09, D11
- User outcome: mentee z konkretnym blokerem dostaje odpowiedź od osoby, która rozwiązała ten sam problem, przez tekst — warunek opisany jako „someone who has actually done this looks at my code and tells me what to do, within the hour”; 1.0 nie obiecuje tej godziny (R12). `[INTERVIEW]` `2026-08-20-interview-working-dev.md`
- Primary metric (podaż, etap 1): liczba z 20 zaproszonych mentorów, którzy w 2 tygodnie odpowiedzą deklaracją ceny, dostępności i zgody na katalog; baseline 0 (nikt nie zaproszony); próg ≥ 5 — cel Natalii, nie pomiar; data otwarta. `[DOCUMENT]` D09
- Metric (podaż, etap 2): liczba deklarujących, którzy w 2 tygodnie od startu 1.0 spełnią definicję realnego mentora (D10); próg ≥ 5 — cel Natalii. `[DOCUMENT]` D09, D10
- Metric (popyt): opłacone sesje tygodniowo; sukces — 10 tygodniowo przez 2 kolejne tygodnie w ciągu 8 tygodni od startu; ostrzeżenie — < 3 w 4. tygodniu; baseline brak (produkt nie działa); progi to cele Natalii, nie pomiary; data startu otwarta. `[DOCUMENT]` D11
- What must not get worse: kwoty liczone po stronie serwera, nigdy z wartości od klienta. `[PRODUCT]` `AGENTS.md` → Bezpieczeństwo

## Scope

- **Now (1.0):** mentor dostaje rolę z zaproszenia operatora (D18), publikuje profil (link do publicznej pracy, opis, R10), cenę w widełkach (R08, D17, R18) i terminy 25/50 min (R01); mentee wchodzi z linku mentora (ze śledzeniem źródła, R14) albo z katalogu opt-in (R11), zakłada konto (R17), rezerwuje termin najpóźniej 2 h przed startem (R16) z obowiązkowym opisem problemu (R04) i płaci z góry (R13; w 1.0 port płatności z adapterem mock, adapter Stripe test mode jako osobne zadanie — D20, R03); mentor widzi opis i może odwołać (R04, R05); sesja tekstowa na ekranie sesji w DevMentorze w oknie slotu (N01, D14, R19); odwołania i nieobecności wg R05–R07 i R20; prowizja R09. Źródło każdej rezerwacji (link mentora vs katalog) jest zapisywane (R14). Test podaży w dwóch etapach (D09); budowa nie czeka na etap 1.
- **Later:** skarbiec notatek i subskrypcja (N03), MCP (N04), publikacja notatek z sesji za zgodą mentee (R02), prowizja zależna od źródła klienta (A06), obietnica czasu odpowiedzi (R12), faktury dla pracodawcy (Q07).
- **Not doing:** see Non-goals

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Sesja | tekstowa konsultacja 25 lub 50 min z jednym mentorem | mentor | mentor, mentee |
| Termin (slot) | opublikowany przez mentora czas, który mentee może zarezerwować | mentor | mentee z linku lub katalogu |
| Opis problemu | obowiązkowe pole formularza rezerwacji; mentor widzi je przed sesją | mentee | mentor |
| Link mentora | adres profilu mentora, który mentor rozsyła sam | mentor | każdy z linkiem |
| Katalog | publiczna lista mentorów, którzy wyrazili zgodę | operator | wszyscy |
| Widełki | minimalna i maksymalna cena sesji ustalona przez operatora | operator | mentor |
| Operator | prowadzący platformę (Natalia): widełki, prowizja, zwroty | Natalia | — |
| Skarbiec | (później) notatki mentora sprzedawane w subskrypcji | mentor | — |

## Key flows

- Current state (mentee): bloker → samodzielne szukanie → pytanie na Slacku/Discordzie → brak lub zła odpowiedź → obejście, rollback albo zgadywanie. `[INTERVIEW]` `2026-08-20-*`, `2026-09-01-*`, `2026-09-02-interview-freelancer-react.md`
- Current state (mentor): pytanie w DM → wklejenie odpowiedzi z prywatnego dokumentu, bez zapłaty. `[INTERVIEW]` `2026-08-22-*`, `2026-09-03-interview-senior-python-meetups.md`
- Future state 1.0 (mentor): zaproszenie z linkiem → profil z publiczną pracą (R10) → cena w widełkach (R08) → terminy (R01) → zgoda na katalog lub nie (R11). Dane do wypłat (Stripe Connect) mentor podaje po rezerwacji, przed pierwszą wypłatą (R15). `[DOCUMENT]` D04, D05, D08, D10
- Future state 1.0 (mentee): link lub katalog → konto (GitHub lub e-mail + hasło, R17) → wybór terminu i długości (najpóźniej 2 h przed startem, R16) → opis problemu (R04) → informacja o bezzwrotności, jeśli < 24 h (R07) → płatność (R13) → mentor czyta opis i prowadzi sesję albo odwołuje ze zwrotem (R05) → sesja tekstowa na ekranie sesji w DevMentorze. `[DOCUMENT]` D05, D07, D12–D15

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sesja trwa 25 lub 50 minut. | rezerwacja | `[DOCUMENT]` D03 (warsztat 2026-08-26) | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R02 | Nic z sesji nie jest publikowane bez zgody mentee. | notatki, skarbiec (później) | `[DOCUMENT]` D03 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R03 | Płatności wyłącznie przez Stripe. | płatności | `[DOCUMENT]` D03 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R04 | Formularz rezerwacji wymaga opisu problemu; mentor widzi go przed sesją i może odwołać przed startem. | rezerwacja | `[DOCUMENT]` D05 | active | gdy test podaży zmierzy czas reakcji | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R05 | Mentor odwołuje lub nie przychodzi → automatyczny pełny zwrot dla mentee przez Stripe, bez zgłoszenia. | odwołania | `[DOCUMENT]` D07 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R06 | Mentee nie przychodzi → mentor zachowuje zapłatę. | nieobecność | `[DOCUMENT]` D07 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R07 | Mentee odwołuje bezpłatnie do 24 h przed sesją; później traci opłatę. Rezerwacja zrobiona na mniej niż 24 h przed sesją jest bezzwrotna dla mentee, co mentee widzi przed płatnością. | odwołania | `[DOCUMENT]` D07, D15 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R08 | Cenę sesji ustala mentor w widełkach operatora; mentee widzi ją przed rezerwacją. | cennik | `[DOCUMENT]` D08 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R09 | Prowizja platformy w 1.0: stałe 20% ceny sesji. | rozliczenia | `[DOCUMENT]` D08 | active | po pierwszych sesjach | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R10 | Profil mentora zawiera link do publicznej pracy i opis tego, co robił; bez ocen. | profil | `[DOCUMENT]` D03 (N02) | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R11 | Mentor jest dostępny przez swój link; w katalogu pojawia się tylko po wyrażeniu zgody. | odkrywanie | `[DOCUMENT]` D04 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R12 | 1.0 nie obiecuje czasu odpowiedzi. | komunikacja produktu | `[DOCUMENT]` D05 | active | gdy test podaży zmierzy czas reakcji | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R13 | Mentee płaci przy rezerwacji, przed sesją. | płatności | `[DOCUMENT]` D12 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R14 | Link mentora ma parametr źródła; każde wejście i rezerwacja z niego są zapisywane jako „z linku mentora”, pozostałe rezerwacje jako z katalogu. | rezerwacja, pomiar | `[DOCUMENT]` D11, D16 | active | przegląd w 4. tygodniu po starcie | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R15 | Mentor przechodzi Stripe Connect przed pierwszą wypłatą, nie przed publikacją terminów ani rezerwacją. | płatności, onboarding mentora | `[DOCUMENT]` D10 | active | unknown | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R16 | Slot można zarezerwować najpóźniej 2 h przed jego startem. | rezerwacja | `[DOCUMENT]` D15 | active | gdy test podaży zmierzy czas reakcji | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R17 | Rezerwacja i płatność wymagają zalogowania; konto przez GitHub lub e-mail + hasło. | rezerwacja, konto mentee | `[DOCUMENT]` D13 | active | po pomiarze porzuceń (A05) | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R18 | Widełki: 25 min 80–215 PLN, 50 min 150–430 PLN, w konfiguracji operatora; cena spoza nowych widełek pozostaje ważna do następnej edycji mentora, który widzi ostrzeżenie. | cennik | `[DOCUMENT]` D17, D19 | active | po deklaracjach etapu 1 (D09) | | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R19 | Ekran sesji przyjmuje wiadomości od startu slotu przez 25/50 min, potem jest tylko do odczytu. | sesja | `[DOCUMENT]` D21 | active | unknown | | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R20 | Nieobecność = brak wiadomości strony w pierwszych 10 min slotu; sesja odbyta = obie strony ≥ 1 wiadomość w oknie sesji; nieobecność mentora (także gdy nikt nie pisze) → pełny zwrot, ma pierwszeństwo przed sesją odbytą. Liczone automatycznie. | nieobecność, wypłaty | `[DOCUMENT]` D22 | active | po pierwszych sesjach | | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |
| R21 | Rolę mentora nadaje zaproszenie operatora (token lub allowlista e-mail); brak publicznej rejestracji mentora w 1.0. | konto mentora | `[DOCUMENT]` D18 | active | unknown | | rekord zastępujący zatwierdzony przez Natalię | Natalia | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Wideo; sesje są tekstowe. | 33 z 54 w ankiecie wybrało tekst; rozmówcy „tekst jest ok”; przyjęte przez Natalię | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/N01-no-video.md`, D03 | none |
| N02 | Oceny i recenzje. | oceny najrzadziej wybrane jako sygnał zaufania (12/54); odrzucone w rozmowach; przyjęte przez Natalię | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/N02-no-ratings.md`, D03 | none |
| N03 | Skarbiec notatek i subskrypcja w 1.0. | brak sygnału po stronie mentee; odłożone | Natalia | active | gdy pojawi się sygnał wartości notatek dla płacącego | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` D01 | none |
| N04 | MCP / dostęp z agenta do kodowania w 1.0. | zależy od skarbca; odłożone | Natalia | active | razem z N03 | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` D01 | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-18 | Zakres 1.0: płatna pomoc tekstowa 25/50 min; skarbiec i MCP później; test podaży równolegle. | tylko potrzeba pilnej pomocy ma oparcie w materiale; alternatywy: skarbiec od początku, test bez budowy; rekomendacja agenta przyjęta | Natalia | active | wynik testu podaży (D09) | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D01-scope-1-0-paid-text-help.md` | none |
| D02 | 2026-10-18 | Natalia jest właścicielką zakresu; materiały warsztatu to wsad, nie zobowiązania. | repo prowadzi Natalia | Natalia | active | unknown | Natalia | `[DOCUMENT]` `decisions/D02-scope-owner-workshop-as-input.md` | none |
| D03 | 2026-10-18 | Przyjęcie N01, N02, sesji 25/50, zgody mentee na publikację, Stripe, 25 h. | rekomendacja agenta przyjęta | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D03-adopt-workshop-rules.md` | none |
| D04 | 2026-10-18 | Link mentora jako główne wejście; katalog opt-in. | alternatywy: sam katalog, sam link; rekomendacja agenta przyjęta | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D04-discovery-link-first-optin-catalog.md` | none |
| D05 | 2026-10-18 | Rezerwacja terminu z obowiązkowym opisem problemu; mentor może odwołać; bez obietnicy czasu. | jedna ścieżka przy 25 h; odrzucona rekomendacja agenta (zgłoszenie → akceptacja) | Natalia | active | gdy test podaży zmierzy czas reakcji | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D05-booking-slot-with-problem-description.md` | none |
| D06 | 2026-10-18 | Test podaży: 20 zaproszeń; < 5 z rezerwowalnym terminem po 2 tygodniach → wstrzymanie i rozmowy z odmawiającymi. | podaż niezmierzona | Natalia | superseded | 2 tygodnie po pierwszej partii (data otwarta) | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D06-supply-test-and-kill-criterion.md` | none |
| D07 | 2026-10-18 | Reguły odwołań i nieobecności R05–R07. | prośby z rozmów 2026-09-02 i 2026-09-03; reguła 24 h dodana przez Natalię | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D07-cancellation-and-no-show.md` | none |
| D08 | 2026-10-18 | Cena mentora w widełkach operatora; prowizja 20% jako cel tymczasowy. | podział 10/20 wg źródła odłożony jako hipoteza | Natalia | active | po pierwszych sesjach | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D08-pricing-and-commission.md` | none |
| D09 | 2026-10-18 | Test podaży w dwóch etapach: deklaracje 20 mentorów przed budową (≥ 5 w 2 tyg.), realni mentorzy po starcie (≥ 5 w 2 tyg.); budowa 1.0 nie czeka na etap 1 — świadome ryzyko. | recenzja wykazała sprzeczność D01 z D06; projekt kursowy powstaje równolegle | Natalia | active | 2 tyg. po wysłaniu zaproszeń; 2 tyg. po starcie 1.0 | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D09-two-stage-supply-test.md` | D06 |
| D10 | 2026-10-18 | Realny mentor = slot + cena + link udostępniony własnej publiczności ≥ 1 raz + zgoda na Stripe Connect przed pierwszą wypłatą. | opublikowany slot nic nie kosztuje; warunek mentorów „bez konta przed rezerwacją” | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D10-real-mentor-definition.md` | none |
| D11 | 2026-10-18 | Popyt: sukces 10 opłaconych sesji/tydz. przez 2 kolejne tygodnie w 8 tyg. od startu; < 3 w 4. tygodniu → stop funkcji i rozmowy z niezarezerwowanymi; źródło rezerwacji zapisywane. | brak obserwowanego popytu; ankieta to deklaracje | Natalia | active | 4. i 8. tydzień po starcie | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D11-demand-criteria.md` | none |
| D12 | 2026-10-18 | Przedpłata przy rezerwacji (R13). | wynikała z D07; propozycja agenta przyjęta | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D12-prepayment-at-booking.md` | none |
| D13 | 2026-10-18 | Konto mentee przed rezerwacją: GitHub lub e-mail + hasło (R17). | alternatywa: rezerwacja bez konta | Natalia | active | po pomiarze porzuceń (A05) | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D13-mentee-account-before-booking.md` | none |
| D14 | 2026-10-18 | Sesja tekstowa na ekranie sesji w DevMentorze. | alternatywa: zewnętrzny komunikator | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D14-in-app-text-session.md` | none |
| D15 | 2026-10-18 | Rezerwacja najpóźniej 2 h przed startem; rezerwacja < 24 h przed sesją bezzwrotna dla mentee (R07, R16). | domyka R07 | Natalia | active | gdy test podaży zmierzy czas reakcji | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D15-booking-cutoff-and-late-booking.md` | none |
| D16 | 2026-10-18 | Link mentora z parametrem źródła; wejścia i rezerwacje z linku zapisywane (R14). | alternatywa: deklaracja mentora | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D16-mentor-link-source-tracking.md` | none |
| D17 | 2026-10-18 | Widełki: 25 min 80–215 PLN, 50 min 150–430 PLN; walidacja na serwerze; konfiguracja operatora (R18). | propozycja 80–300 / 150–550 skorygowana po zestawieniu z ankietą | Natalia | active | po deklaracjach etapu 1 i pierwszych sesjach | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D17-price-ranges.md` | none |
| D18 | 2026-10-18 | Rola mentora z zaproszenia operatora (token / allowlista e-mail); logowanie jak mentee; brak publicznej rejestracji mentora (R21). | alternatywa: publiczna rejestracja „zostań mentorem” | Natalia | active | gdy podaż ma rosnąć poza zaproszonych | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D18-mentor-role-by-invitation.md` | none |
| D19 | 2026-10-18 | Cena spoza nowych widełek ważna do następnej edycji; mentor widzi ostrzeżenie (R18). | alternatywy: przycięcie ceny, blokada rezerwacji | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D19-price-outside-new-range.md` | none |
| D20 | 2026-10-18 | Port płatności + adapter mock w 1.0; adapter Stripe test mode jako osobne, nieblokujące zadanie. | prawdziwe płatności czekają na Q09 | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D20-payment-port-mock-first.md` | none |
| D21 | 2026-10-18 | Ekran sesji zapisywalny od startu slotu przez 25/50 min, potem tylko do odczytu (R19). | domyka D14 | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D21-session-write-window.md` | none |
| D22 | 2026-10-18 | Nieobecność = brak wiadomości w pierwszych 10 min; odbyta = obie strony ≥ 1 wiadomość; nieobecność mentora ma pierwszeństwo (R20). | alternatywa: późne dołączenie liczy się jako odbyta | Natalia | active | po pierwszych sesjach | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D22-no-show-and-held-session.md` | none |
| D23 | 2026-10-18 | Kontaktowalni tylko zalogowani odwiedzający link mentora; wizyty anonimowe tylko zliczane (D16). | domyka D11 | Natalia | active | unknown | rekord zastępujący zatwierdzony przez Natalię | `[DOCUMENT]` `decisions/D23-contactable-visitors.md` | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Zaproszeni mentorzy opublikują rezerwowalne terminy. `[ASSUMPTION]` tablica „mentors first” | high | dwie osoby z listy warunkowo „tak” (znajomi na platformie, pierwszy booking od znajomego, brak konta bankowego przed rezerwacją; staff engineer: miesiąc bez rezerwacji → „zapomnę, że to istnieje”); mentorzy opisali wartość w notatkach, a 1.0 ich nie oferuje; dostępność nieznana; nikt nie zaproszony | 1.0 nie ma podaży; wstrzymanie zaproszeń (D09) | D09 etap 1: deklaracje 20 mentorów w 2 tyg.; etap 2: realni mentorzy (D10) w 2 tyg. od startu | Natalia | 2 tyg. po zaproszeniach; 2 tyg. po starcie | untested; budowa przed wynikiem — accepted untested (D09) |
| A02 | Mentees zapłacą za sesję. `[ASSUMPTION]` | high | ankieta: 37/54 deklaruje „coś” za odpowiedź tekstową w ciągu godziny (nie za rezerwację terminu), 3/54 kiedykolwiek zapłaciło; rozmowy: „zalezy ile”, „chyba” | model przychodu nie działa | D11: opłacone sesje tygodniowo po starcie 1.0, ze źródłem rezerwacji | Natalia | 4. i 8. tydzień po starcie | untested |
| A03 | Rezerwacja terminu bez obietnicy czasu wystarcza mentee w pilnej sytuacji. `[ASSUMPTION]` D05 | high | mentees opisali potrzebę „w dwadzieścia minut”, „within the hour”, „tego samego dnia”; 1.0 pozwala zarezerwować najwcześniej 2 h przed startem (R16) | 1.0 obsłuży tylko niepilne przypadki | w teście podaży zmierzyć, jak daleko w przód mentorzy publikują terminy; w 1.0 — czas od rezerwacji do sesji | Natalia | unknown | untested |
| A04 | Wystarczająco wielu mentorów zgodzi się na katalog, by obcy mógł kogoś znaleźć. `[ASSUMPTION]` D04 | medium | staff engineer odmawia listy; senior Python warunkowo | ścieżka dla obcego nie działa | zgody na katalog w deklaracjach etapu 1 (D09); źródło rezerwacji (R14) | Natalia | razem z D09 | untested |
| A05 | Rezerwacja zajmie mentee mniej niż 5 minut. `[ASSUMPTION]` | medium | dev z fintechu: „jak booking trwa więcej niż pięć minut to robię rollback”; nie chce zakładać konta | porzucone rezerwacje | konto wymagane (D13); pomiar czasu od wejścia z linku/katalogu do opłaconej rezerwacji w 1.0 | Natalia | unknown | untested |
| A06 | Prowizja 20% jest akceptowalna dla mentorów; podział 10/20 wg źródła może być lepszy. `[ASSUMPTION]` D08, benchmark Topmate | low | brak materiału | mentorzy rezygnują | pytanie w rozmowach z odmawiającymi (D09) | Natalia | po pierwszych sesjach | untested |

## Kill criteria

- Podaż, etap 1 (przed budową): jeśli w 2 tygodnie od wysłania zaproszeń mniej niż 5 z 20 mentorów odpowie deklaracją ceny, dostępności i zgody na katalog, Natalia wstrzymuje zaproszenia i rozmawia z odmawiającymi; od wyniku zależy decyzja o dalszym rozwoju (D09).
- Podaż, etap 2 (po starcie): mniej niż 5 deklarujących spełnia definicję realnego mentora (D10) w 2 tygodnie od startu (D09).
- Popyt: mniej niż 3 opłacone sesje w 4. tygodniu po starcie → stop prac nad funkcjami i rozmowy z osobami, które weszły na stronę mentora i nie zarezerwowały; sukces to 10 opłaconych sesji tygodniowo przez 2 kolejne tygodnie w ciągu 8 tygodni (D11).
- Wszystkie progi to wybory Natalii, nie pomiary. Decyduje Natalia. Daty zależą od startu 1.0 (otwarte).

## Hypotheses to test

Brak — nie przeprowadzono symulacji person.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Jakie są widełki cen sesji 25 i 50 min? | — | Natalia (operator), po przejrzeniu benchmarku | closed: 25 min 80–215 PLN, 50 min 150–430 PLN (D17) |
| Q02 | Czy mentee musi założyć konto przed rezerwacją? | — | Natalia | closed: tak, GitHub lub e-mail + hasło (D13) |
| Q03 | Kiedy mentor podaje dane do wypłat (Stripe)? | — | Natalia | closed: po rezerwacji, przed pierwszą wypłatą (D10, R15); możliwość w Stripe Connect do sprawdzenia w specyfikacji płatności |
| Q04 | Jaki wynik po stronie popytu oznacza zatrzymanie lub zmianę 1.0? | — | Natalia | closed: D11 |
| Q05 | Jak często pojedynczy mentee trafia na taki bloker? | no — wpływa na prognozę przychodu, nie na 1.0 | rozmowy z pierwszymi mentees | open |
| Q06 | Gdzie odbywa się sesja tekstowa? | — | Natalia | closed: ekran sesji w DevMentorze (D14) |
| Q07 | Czy 1.0 wystawia fakturę/rachunek dla pracodawcy mentee? | no — 1.0 zakłada płatność mentee | Natalia | open |
| Q08 | Jak działa R07 dla rezerwacji zrobionej mniej niż 24 h przed sesją? | — | Natalia | closed: bezzwrotna dla mentee, widoczne przed płatnością; rezerwacja najpóźniej 2 h przed startem (D15) |
| Q09 | Kto przygotowuje regulamin dla mentorów i mentees (rola prawna bez właściciela)? | yes — przyjmowanie prawdziwych płatności, a więc pomiar popytu (D11); nie blokuje budowy; Natalia: poza 1.0 kursowym | Natalia | open |
| Q10 | Czy odpowiedź ze skarbca cytuje mentora i notatkę? (warsztat 2026-08-26) | no — skarbiec odłożony (N03) | Natalia, gdy skarbiec wróci | open |
| Q11 | Czy beachhead TS/React/Python/AI agents z tablicy obowiązuje dla 1.0 (np. filtry katalogu)? | no | Natalia | open |
| Q12 | Jaki próg dla podziału rezerwacji link mentora vs katalog? | no — przegląd w 4. tygodniu po starcie | Natalia | open |
| Q13 | Jak stwierdzić, że mentor udostępnił link własnej publiczności (D10)? | — | Natalia | closed: parametr źródła w linku (D16) |
| Q14 | Jak konto staje się kontem mentora i czy mentor loguje się jak mentee? (backlog 2026-10-18) | — | Natalia | closed: zaproszenie operatora, logowanie jak mentee (D18) |
| Q15 | Co z ceną mentora, która wypadła poza nowe widełki? (backlog 2026-10-18) | — | Natalia | closed: ważna do następnej edycji, ostrzeżenie w panelu (D19) |
| Q16 | Czy 1.0 ma adapter Stripe test mode, czy tylko mock? (backlog 2026-10-18) | — | Natalia | closed: mock w 1.0, Stripe test mode jako osobne zadanie (D20) |
| Q17 | Kiedy ekran sesji jest zapisywalny? (backlog 2026-10-18) | — | Natalia | closed: od startu slotu przez 25/50 min, potem tylko odczyt (D21) |
| Q18 | Jak rozpoznać nieobecność i sesję odbytą? (backlog 2026-10-18) | — | Natalia | closed: 10 min bez wiadomości / obie strony ≥ 1 wiadomość; nieobecność ma pierwszeństwo (D22) |
| Q19 | Kogo da się zidentyfikować wśród odwiedzających bez rezerwacji? (backlog 2026-10-18) | — | Natalia | closed: tylko zalogowanych; anonimowi zliczani (D23) |

## Definition of Ready addendum (own)

Problems i Target group mają oparcie w rozmowach (3 mentees, 3 mentorów) i w danych z jednej społeczności od jednej osoby; częstotliwość u jednej osoby i faktyczna płatność są nieznane. Decyzje zakresu 1.0 i kryteria testów (D01–D05, D07–D16) są podjęte i przypisane Natalii. A01 ma test (D09), ale budowa 1.0 przed jego wynikiem to ryzyko świadomie przyjęte przez Natalię (D09) — nie dowód podaży. A02, A03 i A05 mają test po starcie (D11, D13). Gotowe do: etapu 1 testu podaży oraz planowania implementacji zakresu 1.0; blokery backlogu (Q01, Q14–Q19) rozstrzygnięte decyzjami D17–D23 (2026-10-18). Pomiar popytu (D11) wymaga prawdziwych płatności, a te — regulaminu (Q09), który Natalia stawia poza 1.0 kursowym: do jego rozstrzygnięcia kryteria popytu nie mogą zostać sprawdzone. Podpis: Natalia, 2026-10-18.

## Collection plan

### Czy mentorzy z listy deklarują cenę, dostępność i zgodę na katalog? (etap 1)

- What decision or work needs it: kryterium etapu 1 (D09); A01, A03, A04; decyzja o dalszym rozwoju
- Who can answer it: 20 pierwszych mentorów z `2026-09-04-mentor-list.csv` (najpierw z ciepłym kontaktem); przy odmowie — rozmowa
- How: zaproszenie z prośbą o deklarację; zestawienie odpowiedzi (cena 25/50, okno dostępności, katalog tak/nie) + notatka z każdej rozmowy z odmawiającym
- Owner and by when: Natalia; 2 tygodnie od wysłania zaproszeń (data otwarta)
- Template: `.ai/specs/research/templates/data-request.md`, `.ai/specs/research/templates/interview-note.md`

### Czy mentorzy stają się realni i czy mentees płacą po starcie 1.0? (etap 2 i popyt)

- What decision or work needs it: etap 2 (D09, D10); kryteria popytu (D11); A02, A03, A05; Q12
- Who can answer it: dane z 1.0 (terminy, ceny, Stripe Connect, rezerwacje ze źródłem, płatności, odwołania, nieobecności, wejścia na stronę mentora bez rezerwacji) + rozmowy z osobami, które nie zarezerwowały
- How: cotygodniowy eksport z 1.0 po starcie
- Owner and by when: Natalia; 2., 4. i 8. tydzień po starcie (data startu otwarta)
- Template: `.ai/specs/research/templates/data-request.md`, `.ai/specs/research/templates/interview-note.md`
