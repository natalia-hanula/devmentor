# Mapa ekranów — Epik 01: konta i role

> Status: **zatwierdzona** (Natalia, 2026-10-20) z decyzjami do luk L01–L24 (sekcja 4).
>
> Identyfikatory ekranów `s01`–`s13`, stanów `sNN.M` i elementu wspólnego `e01` są stałe, bo przypinamy do nich komentarze z prototypu. Nowy ekran albo stan dostaje kolejny wolny numer. Usunięty zostaje w tabeli jako „wycofany”.
>
> Mapa nie zmienia specyfikacji, backlogu ani design systemu. Decyzje, które ich wymagają, są zebrane w sekcji 4 („Do przeniesienia poza mapę”).

## Materiały i wybory

- **Numery historii.** Prompt podaje #12, #13 i #14, ale w `.ai/specs/backlog.md` to epiki E02–E04. Epik 01 to **#11**, a jego historie i zadania to:
  - **#17** (E01-S01): konto e-mailem i hasłem albo przez GitHub;
  - **#18** (E01-S01-T01): e-mail i hasło;
  - **#19** (E01-S01-T02): GitHub OAuth;
  - **#20** (E01-S02): zaproszenie mentora.
- **Specyfikacje.** Epik: `.ai/specs/2026-10-18-e01-konta-i-role.md` (rewizja 4, zaakceptowana), dalej „spec E01”. Prymitywy: `.ai/specs/2026-10-18-platform-primitives.md` (rewizja 5), dalej „PP”.
- **Brief i decyzje.** `.ai/specs/product-brief.md` oraz `.ai/specs/research/decisions/` (D13, D18, D23).
- **Persony.** `personas.md` nie istnieje. W `research/` są tylko wywiady. Dane demo nie są wzorowane na osobach z wywiadów ani z `mentor-list.csv`.
- **Design system.** `packages/ui` jest po etapie 1 (tokeny, Storybook, Foundations). Etap 2, czyli komponenty bazowe, jeszcze się nie zaczął, więc większość braków z sekcji 5 wynika właśnie z tego.

### Kryteria akceptacji w tym przepływie

| Kod | Źródło | Kryterium (skrót) |
|---|---|---|
| **17.1** | #17 | Gość rejestruje się e-mailem i hasłem → konto powstaje, jest zalogowany; ciasteczko `httpOnly`, `sameSite=lax`, `secure` w produkcji, ~24 h |
| **17.2** | #17 | Gość autoryzuje się przez GitHub → konto powiązane z GitHubem, zalogowany |
| **17.3** | #17 | Złe hasło lub nieznany e-mail → ten sam ogólny komunikat, brak logowania |
| **17.4** | #17 | E-mail już zarejestrowany → drugie konto nie powstaje |
| **17.5** | #17 | Seria nieudanych logowań ponad limit → kolejne próby odrzucane |
| **17.6** | #17 | Niezalogowany woła trasę rezerwacji/płatności → 401; hasło i token nie trafiają do logów ani odpowiedzi |
| **18.DoD** | #18 | bcrypt ≥ 12, JWT HS256, kryteria 17.1, 17.3–17.6 |
| **19.DoD** | #19 | 17.2 przechodzi; **odmowa w GitHubie nie tworzy konta** |
| **20.1** | #20 | Operator tworzy zaproszenie dla e-maila → zapisane, operator może je przekazać |
| **20.2** | #20 | Zaproszona osoba loguje się jak mentee (hasło lub GitHub) z zaproszenia → ma rolę mentora |
| **20.3** | #20 | Konto bez zaproszenia wchodzi do panelu mentora → 403; brak publicznej rejestracji mentora |
| **20.4** | #20 | Nieprawidłowy token → rola nie nadana; nie-operator tworzy zaproszenie → 403; token nie w logach |

Pozostałe źródła stanów to rozstrzygnięcia ze spec E01 i PP:
- Q8: weryfikacja e-maila przed pierwszą rezerwacją;
- Q10: łączenie z GitHubem;
- Q15–Q17: zaproszenia i konto operatora;
- G5–G10: decyzje z grill-me;
- etapy A i B z „Phasing”.

Od zatwierdzenia mapy źródłem stanów są też decyzje L01–L24 z sekcji 4.

**Etapy (decyzja L01).** Prototyp pokazuje stan docelowy A+B. Stany i ekrany z etapu B mają w interfejsie prototypu podpis **„[etap B]”**, a w pasku przeglądu jest przełącznik A/B (SC-14). Etap B to tylko stan docelowy prototypu, nie zobowiązanie implementacyjne 1.0, bo GitHub może wypaść przy budżecie. Przełącznik nie jest elementem produktu.

Do etapu B należą:
- reset hasła;
- polityka haseł;
- zmiana adresu i nazwy;
- GitHub;
- ostrzeżenie `noop`.

---

## 1. Ekrany

Rola „gość” oznacza osobę niezalogowaną. Mentor ma zawsze także rolę `mentee`, bo rola mentora dochodzi z zaproszenia do konta z rejestracji. Operator ma wyłącznie rolę `operator` (Q17).

**Strony startowe ról (L03).** Mentee → `/account` (s04). Mentor albo mentor + mentee → `/mentor` (s09). Operator → `/admin/invitations` (s11). Bezpieczny `next` ma pierwszeństwo przed stroną startową (L05).

| ID | Ekran (trasa) | Rola | Stany (szczegóły niżej) | Historia lub kryterium | Komponenty DS |
|---|---|---|---|---|---|
| **s01** | Rejestracja (`/register`) | gość | domyślny, bez GitHuba, ostrzeżenie `noop` [B], wysyłanie, błędy pól, hasło odrzucone [B], konflikt e-maila, 429, 503, sukces, kontekst zaproszenia, zalogowana osoba | 17.1, 17.4, 17.2 [B], 20.2, L05, L08, L19 | `CrudForm`, `Input`, `Label`, `Button` (outline dla GitHuba, link dla „Zaloguj się”), `Card` — **luki:** DS01, DS02, DS03, DS04, DS05 |
| **s02** | Logowanie (`/login`) | gość | domyślny, bez GitHuba, wysyłanie, ogólny 401, 429, 503, błąd GitHuba `?error=`, sukces, powrót do `next`, sesja wygasła, kontekst zaproszenia, zalogowana osoba, „Wylogowano” | 17.3, 17.5, 17.2 [B], 19.DoD, 20.2, L03–L05, L07, L08 | jak s01 + `Button` link („Nie pamiętasz hasła?” [B]) — **luki:** jak s01 |
| **s03** | Autoryzacja w GitHubie (**symulacja usługi zewnętrznej**) [B] | gość, zalogowany | autoryzuj, anuluj, GitHub niedostępny | 17.2, 19.DoD | `Card`, `Button` — ekran nie jest częścią produktu, tylko zastępuje GitHuba w prototypie |
| **s04** | Konto (`/account`) — **start mentee** | mentee, mentor, operator | ładowanie, adres potwierdzony, adres niepotwierdzony, ponowna wysyłka, zmiana adresu [B], edycja nazwy [B], komunikat po połączeniu z GitHubem [B], błąd, wylogowanie, widok operatora | 17.1, Q8, G6, G7, Q10, L03, L04, L06 | `Card`, `Badge` (role, status e-maila), `Button`, `CrudForm`, `LoadingMessage`, `ErrorMessage`, e01 — **luki:** DS02, DS06 |
| **s05** | Potwierdzenie e-maila (`/verify-email#token=`) | gość, każdy zalogowany | ładowanie, sukces, link nieważny, już potwierdzony, brak tokenu, 429, 503, token innego konta | Q8, G10, 18.DoD, L13, L14, L23 | `Card`, `LoadingMessage`, `ErrorMessage`, `Button` — **luka:** DS02 |
| **s06** | Nie pamiętam hasła (`/forgot-password`) [B] | gość | domyślny, wysyłanie, wynik zawsze ten sam, zły format, 429, 503, adres konta operatora | Q9, G9, L16 | `CrudForm`, `Card`, `Button` — **luki:** DS01, DS02 |
| **s07** | Nowe hasło (`/reset-password#token=`) [B] | gość (także zalogowany) | formularz, wysyłanie, sukces, link nieważny, hasło odrzucone, 429/503, brak tokenu | Q9, G5, L13, L14, L15 | `CrudForm`, `Card`, `ErrorMessage` — **luki:** DS01, DS02 |
| **s08** | Zaproszenie mentora (`/invite#token=`) | gość, mentee, mentor, operator | gość z tokenem, zalogowany „Przyjmij”, przyjmowanie, sukces, już mentor, nieważne, konto operatora, brak tokenu, 429/503 | 20.2, 20.4, Q15, Q17, G7, L02, L09, L14, L15, L17, L18 | `Card`, `Button`, `LoadingMessage`, `ErrorMessage` — **luka:** DS05 |
| **s09** | Panel mentora — start (`/mentor`) — **start mentora** | mentor | domyślny, baner niepotwierdzonego adresu, brak dostępu (mentee), brak dostępu (operator), przekierowanie gościa, rola odebrana w trakcie, ładowanie/503 | 20.3, G7, Q16, L03, L10 | `Card`, `Button`, `ErrorMessage`, `LoadingMessage`, e01 — **luki:** DS02, DS06 |
| **s10** | Panel operatora — Przegląd (`/admin`) | operator | domyślny, brak dostępu, przekierowanie gościa, 503 | PP (bramki stron, nawigacja) | istniejące: `Card`, `Badge`, `Button`, `LoadingMessage`, `ErrorMessage` (karta stanu bazy), e01 — **luka:** DS06 |
| **s11** | Zaproszenia (`/admin/invitations`) — **start operatora** | operator | ładowanie, pusta lista, lista ze statusami, formularz zaproszenia, jednorazowy link, poprzednie cofnięte, `mailFailed`, konflikt 409, „Cofnij”, „Odbierz rolę”, brak dostępu, błąd listy | 20.1, 20.4, Q11, Q15, Q16, L03, L10, L12, L20 | `DataTable`, `CrudForm` (e-mail), `Badge`, `Button`, `Card`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, e01 — **luki:** DS07, DS08, DS09, DS10 |
| **s12** | Skrzynka deweloperska (`/admin/outbox`) | operator | lista, pusta, rozwinięta wiadomość, ładowanie/błąd, wyłączona (`noop`), brak dostępu | PP (outbox), G10 | `DataTable`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, e01 — **luki:** DS12, DS02 |
| **s13** | Brak dostępu (wspólny widok w s08–s12) | zalogowany bez wymaganej roli | bez roli, operator na stronie mentora/zaproszenia | 20.3, 20.4, PP, L09 | `ErrorMessage`, `Button` — **luka:** DS11 |

Poza mapą, choć pojawiają się w nawigacji operatora z PP: „Technologie” i „Konfiguracja” (`/admin/settings`). Nie należą do Epiku 01, więc w prototypie będą nieaktywnymi pozycjami z dopiskiem.

### Element wspólny

| ID | Element | Gdzie | Zawartość | Źródło |
|---|---|---|---|---|
| **e01** | Nagłówek zalogowanego — **propozycja** | s04, s09–s12 | nazwa użytkownika; `/account` dla każdego; `/mentor` tylko dla mentora; `/admin/invitations` tylko dla operatora; „Wyloguj” (→ s02.13) | L21 |

W prototypie e01 ma dopisek „propozycja”. Przed implementacją potrzebne jest nowe kryterium E01. Ukrycie linku w nagłówku nie zastępuje bramek ról po stronie serwera.

### Kto co widzi

| Ekran | Gość | Mentee | Mentor (+ mentee) | Operator |
|---|---|---|---|---|
| s01, s02 | ekran | bezpieczny `next`, inaczej → s04 (L05) | bezpieczny `next`, inaczej → s09 (L05) | bezpieczny `next`, inaczej → s11 (L05) |
| s03 [B] | ekran (symulacja) | — | — | odmowa `github_operator_account` |
| s04 | przekierowanie do `/login?next=/account` (PP) | ekran (start) | ekran | ekran bez edycji nazwy i bez linku do hasła (L06) |
| s05 | ekran (sukces albo „link nieważny”) | ekran | ekran | „już potwierdzony” (tylko bez tokenu, L23) |
| s06, s07 [B] | ekran | ekran | ekran | s06: neutralna odpowiedź, bez maila (L16) |
| s08 | zaproszenie + logowanie/rejestracja | „Przyjmij” | „Przyjmij” → „Masz już rolę mentora” | s13.2 (403, Q17, L09) |
| s09 | przekierowanie do `/login?next=/mentor` | s13 | ekran (start) | s13 |
| s10–s12 | przekierowanie do `/login?next=…` | s13 | s13 | ekran (s11 = start) |

### Stany ekranów i ich źródła

Kategorie z polecenia: domyślny (D), pusty (P), ładowanie (Ł), błąd (B), brak dostępu (BD), konflikt (K), wynik zewnętrznej usługi (Z). Teksty oznaczone „propozycja” zostaną przedstawione do akceptacji w prototypie (L11, L12).

**s01 Rejestracja**
- s01.1 D: przycisk „Kontynuuj z GitHubem” [B], separator, pola: wyświetlana nazwa, e-mail, hasło (podpowiedź „min. 12 znaków”), „Załóż konto”, link „Masz konto? Zaloguj się”. *Źródło:* spec E01 UI/UX, Q13.
- s01.2 D: bez przycisku GitHub (brak konfiguracji; w widoku etapu A tak jest zawsze). *Źródło:* spec E01 Edge „Brak `GITHUB_*`”, L01.
- s01.3 Z [B]: stałe ostrzeżenie nad formularzem „Potwierdzanie adresu e-mail jest chwilowo niedostępne…” przy `MAIL_ADAPTER=noop`. *Źródło:* spec E01 UI/UX, PP `isMailDeliveryAvailable`.
- s01.4 Ł: wysyłanie formularza. *Źródło:* `AGENTS.md` (stany przez `feedback/*`, `CrudForm`).
- s01.5 B: błędy przy polach (format e-maila, hasło < 12 znaków, hasło > 72 bajty, pusta nazwa, za długa nazwa). *Źródło:* spec E01 API (400 `fieldErrors`), Edge.
- s01.6 B [B]: „To hasło jest zbyt popularne lub łatwe do odgadnięcia” przy polu hasła. *Źródło:* G5.
- s01.7 K: „Ten e-mail ma już konto” przy polu e-mail + link „Zaloguj się”. „Nie pamiętasz hasła?” pojawia się tylko w widoku etapu B. *Źródło:* 17.4, G8, L19.
- s01.8 B: 429 „Za dużo prób. Spróbuj za chwilę.” *Źródło:* spec E01 limiter `register:*`, PP krok 7.
- s01.9 B: 503, ogólny błąd formularza. *Źródło:* spec E01 Edge „Baza niedostępna”.
- s01.10 D: sukces → bezpieczny `next` albo strona startowa roli (dla nowego konta: s04). Także wtedy, gdy wysyłka e-maila się nie udała. *Źródło:* 17.1, spec E01 „Wysyłka poczty”, L03.
- s01.11 D: wejście z `next=/invite`, informacja „Po zalogowaniu przyjmiesz zaproszenie do roli mentora”. Po sukcesie powrót do s08. Token jest tylko w `sessionStorage`, nigdy w `next`. *Źródło:* spec E01 `/invite`, 20.2, L08.
- s01.12 D: wejście zalogowanej osoby → bezpieczny `next` (np. `/invite`), bez `next` → strona startowa roli. *Źródło:* L05.

**s02 Logowanie**
- s02.1 D: jak s01.1 bez nazwy, plus „Nie pamiętasz hasła?” [B]. *Źródło:* spec E01 UI/UX.
- s02.2 D: bez GitHuba. *Źródło:* jak s01.2.
- s02.3 Ł: wysyłanie. *Źródło:* `AGENTS.md`.
- s02.4 B: „Nieprawidłowy e-mail lub hasło”, ten sam dla nieznanego e-maila, złego hasła i konta bez hasła. *Źródło:* 17.3, spec E01 Edge.
- s02.5 B: 429 po limicie `login:ip+email` / `login:ip`. *Źródło:* 17.5.
- s02.6 B: 503. *Źródło:* spec E01 Edge.
- s02.7 Z [B]: komunikat z `?error=`. `github_email_unverified` ma tekst ze spec, a dla `github_unavailable`, `github_denied`, `github_state`, `github_no_verified_email`, `github_operator_account` i `unexpected` są propozycje tekstów. Teksty nie ujawniają danych o koncie. *Źródło:* spec E01 API (callback), Edge, PP `redirectHandler`, L11.
- s02.8 D: sukces bez `next` → strona startowa roli (mentee s04, mentor s09, operator s11). *Źródło:* L03.
- s02.9 D: sukces z `next` (np. `/mentor`, `/admin/invitations`, `/invite`) → powrót. Złośliwe `next` → `/`. *Źródło:* PP `safeNextPath`, spec E01 Edge, L05.
- s02.10 BD: po wygaśnięciu sesji komunikat „Sesja wygasła — zaloguj się ponownie” (z listy dozwolonych komunikatów). Wpisane formularze mogą przepaść w 1.0, ale token zaproszenia w `sessionStorage` zostaje. *Źródło:* PP (24 h), L07.
- s02.11 D: wejście z `next=/invite`: „Po zalogowaniu przyjmiesz zaproszenie do roli mentora”. *Źródło:* L08.
- s02.12 D: wejście zalogowanej osoby → bezpieczny `next`, bez `next` → strona startowa roli. *Źródło:* L05.
- s02.13 D: po „Wyloguj” (z s04, e01, s13) komunikat „Wylogowano”. *Źródło:* L04, L09.

**s03 GitHub (symulacja) [B]**
- s03.1 Z: „Autoryzuj” → callback → konto nowe, rozpoznane albo połączone (warianty sterowane scenariuszem SC-03). *Źródło:* 17.2, Q10, spec E01 Edge.
- s03.2 Z: „Anuluj” → s02.7 `github_denied`, konto nie powstaje. *Źródło:* 19.DoD.
- s03.3 Z: GitHub niedostępny → s02.7 `github_unavailable`. *Źródło:* spec E01 Edge „GitHub API niedostępne”.

**s04 Konto (start mentee)**
- s04.1 Ł: ładowanie (`/api/auth/me`). *Źródło:* `AGENTS.md`.
- s04.2 D: e-mail, wyświetlana nazwa, role, status „potwierdzony”, „Wyloguj”. *Źródło:* spec E01 UI/UX.
- s04.3 D: niepotwierdzony adres. Baner „Potwierdź adres e-mail — będzie potrzebny przed pierwszą rezerwacją”, przyciski „Wyślij ponownie” i „Zmień adres” [B]. *Źródło:* Q8, spec E01 UI/UX.
- s04.4 D/B: po „Wyślij ponownie” potwierdzenie (tekst: propozycja) albo 429. *Źródło:* spec E01 API (`verify-resend:user` 3/h), L12.
- s04.5 K [B]: zmiana adresu. Warianty: sukces (nowy link, stary nieważny), 409 „Ten e-mail ma już konto”, 400, 429. *Źródło:* spec E01 API `PUT /api/auth/email`, Edge.
- s04.6 D/B [B]: edycja wyświetlanej nazwy (mentee, mentor): sukces albo błąd pola. *Źródło:* G6.
- s04.7 Z [B]: baner `?notice=github_linked_password_disabled` z tekstem ze spec, bez zmian. *Źródło:* spec E01 Edge (pre-account takeover), L11.
- s04.8 B: błąd ładowania (503) z ponowieniem. *Źródło:* PP Edge.
- s04.9 D: „Wyloguj” → s02.13. *Źródło:* L04.
- s04.10 D: widok operatora: e-mail, nazwa, role i status e-maila tylko do odczytu oraz „Wyloguj”. Bez edycji nazwy i bez linku do zmiany hasła (reset operatora tylko przez CLI). *Źródło:* L06, Q3.

**s05 Potwierdzenie e-maila**
- s05.1 Ł: wysyłanie tokenu (POST). Gdy w URL jest `#token=`, token idzie do potwierdzenia zawsze, niezależnie od sesji. *Źródło:* spec E01 UI/UX, L23.
- s05.2 D: sukces. Zalogowany → „Przejdź do konta” (strona startowa roli), gość → „Zaloguj się”. *Źródło:* L13.
- s05.3 B: „Link jest nieważny albo wygasł”. Zalogowany z niepotwierdzonym adresem → „Wyślij ponownie”, gość → „Zaloguj się, aby wysłać nowy link”. *Źródło:* spec E01 API, L13, L14.
- s05.4 D: zalogowany z potwierdzonym adresem i **bez tokenu** → „Twój adres jest już potwierdzony”. *Źródło:* spec E01 UI/UX, L14, L23 (korekta spec).
- s05.5 B: brak tokenu, a sesja nie ma potwierdzonego adresu → „Link jest nieważny albo wygasł”. *Źródło:* L14.
- s05.6 B: 429 (`token-confirm:ip`). *Źródło:* spec E01 limiter.
- s05.7 B: 503. *Źródło:* spec E01 Edge.
- s05.8 D: token innego konta przy zalogowanej osobie A → „Potwierdzono adres b@…. To inne konto niż to, które jest teraz zalogowane.” Sesja A bez zmian. *Źródło:* L23 (korekta spec i testów; tekst neutralny wg L18, 2026-10-20).

**s06 Nie pamiętam hasła [B]**
- s06.1 D: pole e-mail, „Wyślij link”. *Źródło:* spec E01 krok 6.
- s06.2 Ł: wysyłanie. *Źródło:* `AGENTS.md`.
- s06.3 D: zawsze „Jeśli konto istnieje, wysłaliśmy link”. *Źródło:* spec E01 API, OWASP.
- s06.4 B: zły format e-maila. *Źródło:* spec E01 API (400).
- s06.5 B: 429. *Źródło:* spec E01 limiter `reset-request:*`.
- s06.6 B: 503. *Źródło:* spec E01 Edge.
- s06.7 D: adres konta operatora → ta sama neutralna odpowiedź co s06.3, ale bez tokenu i bez maila (w s12 nic nie przybywa). *Źródło:* L16 (korekta spec).

**s07 Nowe hasło [B]**
- s07.1 D: pole nowego hasła. *Źródło:* spec E01 API `password-reset/confirm`.
- s07.2 Ł: wysyłanie. *Źródło:* `AGENTS.md`.
- s07.3 D: sukces, bez automatycznego logowania → „Zaloguj się” (s02). *Źródło:* spec E01 API, L13.
- s07.4 B: „Link jest nieważny albo wygasł” z akcją „poproś o nowy link” (→ s06). Token jest sprawdzany dopiero przy wysłaniu, co jest świadomym kompromisem. *Źródło:* spec E01 UI/UX, L14, L15.
- s07.5 B: hasło za krótkie, za długie albo zbyt popularne. *Źródło:* G5.
- s07.6 B: 429/503. *Źródło:* spec E01 limiter, Edge.
- s07.7 B: brak tokenu we fragmencie → „Link jest nieważny albo wygasł”. *Źródło:* L14.

**s08 Zaproszenie**
- s08.1 D (gość): „Masz zaproszenie do roli mentora w DevMentor. Zaloguj się lub załóż konto, aby je przyjąć.” Token trafia do `sessionStorage`, a linki prowadzą do s01.11/s02.11 z `next=/invite` (bez sekretu). *Źródło:* spec E01 UI/UX, 20.2, L02, L18.
- s08.2 D (zalogowany): przycisk „Przyjmij zaproszenie”. Rola jest nadawana dopiero po kliknięciu. *Źródło:* spec E01 UI/UX, L02.
- s08.3 Ł: przyjmowanie (token sprawdzany dopiero teraz). *Źródło:* `AGENTS.md`, L15.
- s08.4 D: sukces → token usunięty z `sessionStorage` → s09. *Źródło:* 20.2.
- s08.5 K: `alreadyMentor` → „Masz już rolę mentora”, token zużyty → s09. *Źródło:* spec E01 Edge, rewizja 1.
- s08.6 B: „Zaproszenie jest nieważne” (wygasłe, cofnięte, przyjęte albo zmyślone, jeden komunikat) + „Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.” `sessionStorage` wyczyszczony. *Źródło:* 20.4, spec E01 Edge, L15, L17.
- s08.7 BD: konto operatora → s13.2 z dodatkowym zdaniem „Zaproszenia przyjmuje konto mentora, nie operatora”. *Źródło:* Q17, L09.
- s08.8 B: brak tokenu w hashu **i** w `sessionStorage` → „Link jest nieważny albo wygasł”. *Źródło:* spec E01 UI/UX, L14 (zastępuje tekst ze spec „Otwórz link z zaproszenia jeszcze raz”).
- s08.9 B: 429/503. *Źródło:* spec E01 limiter `token-confirm:ip`, Edge.

**s09 Panel mentora (start mentora)**
- s09.1 D: „Masz rolę mentora. Profil, cena i terminy pojawią się tu w kolejnym etapie”, nagłówek e01. *Źródło:* spec E01 UI/UX, L21.
- s09.2 D: baner „Potwierdź adres e-mail — bez tego nie opublikujesz profilu” + „Wyślij ponownie”. *Źródło:* G7.
- s09.3 BD: mentee → s13.1. *Źródło:* 20.3.
- s09.4 BD: operator → s13.2. *Źródło:* Q17.
- s09.5 BD: gość → przekierowanie `/login?next=/mentor`. *Źródło:* PP bramki stron, spec E01 krok 18.
- s09.6 BD: rola odebrana przy otwartym panelu → s13.1 przy następnym żądaniu. W E01 bez osobnego komunikatu (los rezerwacji rozstrzyga E03). *Źródło:* Q16, spec E01 Edge, L10.
- s09.7 Ł/B: ładowanie, 503. *Źródło:* PP Edge.

**s10 Panel operatora — Przegląd**
- s10.1 D: istniejąca strona `/admin` (karta stanu bazy) + nawigacja: „Przegląd”, „Technologie”, „Konfiguracja”, „Skrzynka”, „Zaproszenia”. Strona startowa operatora to s11, nie s10. *Źródło:* PP UI/UX, L03.
- s10.2 BD: mentee/mentor → s13.1. *Źródło:* PP bramki stron.
- s10.3 BD: gość → przekierowanie `/login?next=/admin`. *Źródło:* PP.
- s10.4 B: 503. *Źródło:* PP Edge.

**s11 Zaproszenia (start operatora)**
- s11.1 Ł: ładowanie listy. *Źródło:* `AGENTS.md` (`DataTable`).
- s11.2 P: brak zaproszeń (tekst: propozycja). *Źródło:* L12.
- s11.3 D: tabela: e-mail, status (Oczekuje / Przyjęte / Cofnięte / Wygasło, wyliczany wg reguły spec `accepted` > `revoked` > `expired` > `pending`), utworzone, wygasa, przyjęte przez. Przy „Przyjęte” może być wtórna informacja „rola mentora odebrana”, bez daty i bez piątego statusu. *Źródło:* spec E01 UI/UX, Data Model, L10, L12.
- s11.4 D/B: „Zaproś mentora” → `CrudForm` z polem e-mail, błąd 400 przy polu. *Źródło:* 20.1.
- s11.5 D: jednorazowy panel z linkiem, „Kopiuj”, „Link widzisz tylko teraz”. *Źródło:* 20.1, spec E01 UI/UX.
- s11.6 D: przy `revokedPrevious` prawdziwym panel dodaje: „Poprzednie zaproszenie dla tego adresu zostało cofnięte”. *Źródło:* spec E01 API, L20.
- s11.7 Z: `mailFailed: true` → ostrzeżenie, że e-mail nie wyszedł i link trzeba przekazać samodzielnie (tekst: propozycja). *Źródło:* spec E01 „Wysyłka poczty”.
- s11.8 K: 409 „Zaproszenie dla tego adresu właśnie powstało — odśwież listę”. *Źródło:* spec E01 Data Model.
- s11.9 D/K: „Cofnij” (tylko Oczekuje) → sukces; 409 „Zaproszenie zostało już przyjęte”; 404. *Źródło:* spec E01 API.
- s11.10 D/K: „Odbierz rolę mentora” (tylko Przyjęte) z potwierdzeniem → sukces, wiersz dostaje „rola mentora odebrana”; 404 „brak roli”. *Źródło:* Q16, L10.
- s11.11 BD: mentee/mentor → s13.1 (strona), 403 (API). *Źródło:* 20.4.
- s11.12 B: błąd listy (503) z ponowieniem. *Źródło:* PP Edge.

**s12 Skrzynka deweloperska**
- s12.1 D: tabela: data, adresat, temat. Nad tabelą adnotacja „Skrzynka deweloperska — wiadomości nie są wysyłane”. *Źródło:* PP UI/UX.
- s12.2 P: brak wiadomości (także po restarcie procesu; tekst: propozycja). *Źródło:* PP Edge „Restart procesu”, L12.
- s12.3 D: rozwinięta wiadomość z klikalnym linkiem (→ s05, s07, s08). *Źródło:* PP UI/UX, G10.
- s12.4 Ł/B: ładowanie, błąd. *Źródło:* `AGENTS.md`.
- s12.5 Z: `noop` → 404, brak pozycji w nawigacji. *Źródło:* PP API.
- s12.6 BD: nie-operator → s13.1. *Źródło:* PP.

**s13 Brak dostępu** (tylko dla zalogowanej osoby z niewłaściwą rolą; gościa przekierowujemy na `/login`)
- s13.1 BD: tytuł „Nie masz dostępu do tej strony”, zdanie „Ta strona wymaga roli {rola}”, przycisk „Wróć do swojej strony startowej” (→ L03) i link „Zaloguj się innym kontem”, który najpierw wylogowuje bieżącą sesję (→ s02.13). *Źródło:* 20.3, PP, L09.
- s13.2 BD: konto operatora na s08 i s09. Jak s13.1, a na s08 dodatkowo „Zaproszenia przyjmuje konto mentora, nie operatora”. *Źródło:* Q17, L09.

---

## 2. Scenariusze do przełączania w prototypie

To kontrolki paska przeglądu, nie funkcje produktu.

| ID | Kontrolka | Wartości | Dotyczy |
|---|---|---|---|
| SC-01 | Zalogowane konto | gość, K1…K8 (sekcja 3) | wszystkie |
| SC-02 | GitHub skonfigurowany | tak / nie (w etapie A zawsze „nie”) | s01.1–2, s02.1–2 |
| SC-03 | Wynik GitHuba [B] | nowe konto, konto rozpoznane po `github_user_id`, połączenie z kontem z potwierdzonym adresem, połączenie z niepotwierdzonym (hasło wyłączone), anulowanie, niedostępny, zły `state` / wygasłe ciasteczko, brak potwierdzonego adresu, adres istnieje, ale niepotwierdzony w GitHubie, adres konta operatora | s03, s02.7, s04.7 |
| SC-04 | Poczta | outbox / `noop` | s01.3, s12.5 |
| SC-05 | Wysyłka e-maila | udana / nieudana | s01.10, s11.7 |
| SC-06 | Następne żądanie | normalnie / 429 / 503 / opóźnione (pokazuje ładowanie) | wszystkie formularze i listy |
| SC-07 | Link weryfikacyjny | ważny / ważny, ale innego konta niż zalogowane / wygasły lub zużyty / brak tokenu | s05 |
| SC-08 | Link resetu [B] | ważny / wygasły / brak tokenu | s07 |
| SC-09 | Zaproszenie | ważne / nieważne (wygasłe, cofnięte, przyjęte, zmyślone) / brak tokenu | s08 |
| SC-10 | Sesja wygasła | przy następnym żądaniu | s04, s09–s12 → s02.10 |
| SC-11 | Operator odebrał rolę mentora | przy następnym żądaniu | s09.6 |
| SC-12 | Wyścig przy tworzeniu zaproszenia | 409 przy następnym „Zaproś” | s11.8 |
| SC-13 | Hasło odrzucone przez politykę [B] | przy następnym wysłaniu | s01.6, s07.5 |
| SC-14 | **Etap A / B** | A / A+B (domyślnie A+B, L01) | wszystkie elementy z podpisem „[etap B]” |
| SC-15 | Zegar demo | stały „teraz” / „teraz + 25 h” (wygasa link weryfikacyjny i sesja) | s05, SC-10 |

Każdy formularz musi umieć wywołać błąd przy polu: zajęty e-mail (dane K1) i złe hasło (każde inne niż demo).

## 3. Konta i dane demo

Wszystko jest fikcyjne. Adresy są w domenie `example.com` (zarezerwowanej do przykładów). Prototyp nie zbiera haseł: pole przyjmuje dowolny ciąg, a jako „poprawne” traktuje `demo-haslo-12`. Na ekranie widnieje dopisek, że to symulacja.

**Stały „teraz”:** środa **2026-10-21, 10:00 Europe/Warsaw**.

| ID | Konto | Role | E-mail | Logowanie | Stan | Strona startowa (L03) |
|---|---|---|---|---|---|---|
| K1 | Marta Kowal | mentee | marta.kowal@example.com | hasło | adres potwierdzony; wzorzec „mentee gotowy” i zajęty adres do s01.7 | s04 |
| K2 | Piotr Lis | mentee | piotr.lis@exmaple.com (celowa literówka) | hasło | adres niepotwierdzony, link weryfikacyjny wysłany 2026-10-20 18:00 (ważny do 2026-10-21 18:00) | s04 |
| K3 | `jkrol-dev` | mentee | jakub.krol@example.com | tylko GitHub [B] | nazwa = login GitHuba (G6), adres potwierdzony, bez hasła | s04 |
| K4 | Ewa Zielińska | mentee + mentor | ewa.zielinska@example.com | hasło | adres potwierdzony; zaproszenie przyjęte 2026-10-14 | s09 |
| K5 | Tomasz Wrona | mentee + mentor | tomasz.wrona@example.com | hasło | adres niepotwierdzony (baner G7 na s09) | s09 |
| K6 | Operator Demo | operator | operator@example.com | tylko hasło (konto z CLI) | adres potwierdzony; s06.7 dla jego adresu | s11 |
| K7 | Adam Nowy | — (gość) | adam.nowy@example.com | — | ma ważne zaproszenie, nie ma konta (ścieżka „zaproszenie → rejestracja → przyjęcie”) | po przyjęciu s09 |
| K8 | Karol Sowa | mentee | karol.sowa@example.com | hasło | rola mentora odebrana 2026-10-19 (SC-11, s11.10) | s04 |

**Zaproszenia** (s11), ważność 14 dni (Q11):

| E-mail | Utworzone | Wygasa | Status | Przyjęte przez |
|---|---|---|---|---|
| adam.nowy@example.com | 2026-10-20 09:00 | 2026-11-03 09:00 | Oczekuje | — |
| ewa.zielinska@example.com | 2026-10-13 12:00 | 2026-10-27 12:00 | Przyjęte | Ewa Zielińska |
| tomasz.wrona@example.com | 2026-10-15 08:30 | 2026-10-29 08:30 | Przyjęte | Tomasz Wrona |
| karol.sowa@example.com | 2026-10-10 10:00 | 2026-10-24 10:00 | Przyjęte + „rola mentora odebrana” (L10) | Karol Sowa |
| lena.mazur@example.com | 2026-10-01 10:00 | 2026-10-15 10:00 | Wygasło | — |
| olga.bury@example.com | 2026-10-12 14:00 | 2026-10-26 14:00 | Cofnięte | — |

**Skrzynka** (s12), od najnowszej:
1. 2026-10-21 09:30, do marta.kowal@example.com, „Ustaw nowe hasło” [B] (link do s07, ważny do 10:30);
2. 2026-10-20 18:00, do piotr.lis@exmaple.com, „Potwierdź adres e-mail” (link do s05; otwarty na koncie K1 daje s05.8);
3. 2026-10-20 09:00, do adam.nowy@example.com, „Zaproszenie do DevMentor” (link do s08).

**Dane z briefu.** Ekrany Epiku 01 nie pokazują cen ani terminów: s09 mówi wprost, że profil, cena i terminy przyjdą w E02. Nie wstawiam więc widełek (25 min 80–215 PLN, 50 min 150–430 PLN, D17) ani prowizji (20%, D08). Z briefu biorę tylko nazwy ról (mentee, mentor, operator), nazwę produktu i zasady kont (R17, R21, D13, D18, D23).

## 4. Luki w specyfikacji

Wszystkie 24 luki mają decyzję (Natalia, 2026-10-20). „Uwaga” oznacza rozbieżność między decyzją a materiałami, którą zauważyłam przy wpisywaniu. Decyzji nie zmieniałam, uwagi czekają na potwierdzenie.

| ID | Typ | Luka | Pytanie | Decyzja (2026-10-20) |
|---|---|---|---|---|
| **L01** | decyzja | Spec dzieli wdrożenie na etap A i B (G9). GitHub, reset hasła, zmiana adresu i nazwy, polityka haseł i ostrzeżenie `noop` wchodzą dopiero w etapie B. Prompt prototypu wymienia „logowanie GitHubem” jako część przepływu. | Czy prototyp pokazuje docelowy stan po etapie B, czy tylko etap A? | Stan docelowy A+B. Ekrany B mają podpis „[etap B]”, a w pasku przeglądu jest przełącznik A/B (SC-14). Etap B to tylko stan docelowy prototypu, nie zobowiązanie implementacyjne 1.0, bo GitHub może wypaść przy budżecie. Przełącznik nie jest elementem produktu. |
| **L02** | sprzeczność (#20 ↔ spec ↔ brief) | Kryterium 20.2: osoba „loguje się z zaproszenia” i **ma** rolę mentora. Spec wymaga osobnego kroku „Przyjmij zaproszenie” po zalogowaniu. Kryterium 20.1, R21 i D18 dopuszczają też allowlistę, którą spec odrzuciła (Q11). | Wersja spec czy nadawanie roli bez klikania? | Wersja spec: link `/invite#token=…`, token tylko w `sessionStorage`, `next=/invite` bez sekretu. Po zalogowaniu osobne kliknięcie „Przyjmij zaproszenie”, rola nadawana dopiero po nim. Bez allowlisty. Backlog #20 i D18 do poprawy później, nie w mapie. |
| **L03** | brak ekranu (strony startowe ról) | Mentee nie ma strony startowej, cel logowania bez `next` nie jest opisany, a `/admin` nie jest ustalony jako start operatora. | Dokąd trafia każda rola po zalogowaniu bez `next`? | Mentee → `/account`. Mentor oraz mentor + mentee → `/mentor`. Operator → `/admin/invitations`. Mentee nie dostaje w E01 osobnej strony startowej. |
| **L04** | brak stanu | Nie wiadomo, dokąd prowadzi „Wyloguj”. | Gdzie ląduje wylogowana osoba? | „Wyloguj” → `/login` z komunikatem „Wylogowano” (s02.13). |
| **L05** | brak stanu | Nie opisano, co widzi zalogowana osoba na `/login` i `/register`. | Przekierować czy pokazać formularz? | Bezpieczny `next` ma pierwszeństwo (zalogowany z `next=/invite` trafia na `/invite`). Bez `next` → strona startowa roli z L03 (s01.12, s02.12). |
| **L06** | brak decyzji | Nie wiadomo, czy operator ma `/account`. | Czy operator ma `/account`? | Operator ma `/account` jak każdy: podgląd e-maila, nazwy, ról i statusu e-maila oraz „Wyloguj”. Bez edycji nazwy i bez linku do zmiany hasła (reset operatora tylko przez CLI) (s04.10). **Uwaga:** uzasadnienie „brak endpointu” nie zgadza się ze spec, bo `PUT /api/auth/display-name` jest tam „dla wszystkich kont” (G6). Zakaz edycji nazwy dla operatora to więc korekta spec, a nie skutek braku trasy. |
| **L07** | stan bez kryterium | Po wygaśnięciu sesji przekierowanie do `/login` nie ma wyjaśnienia, a wpisany formularz przepada. | Czy pokazujemy „Sesja wygasła”? | Tak: „Sesja wygasła — zaloguj się ponownie” na `/login` (komunikat z listy dozwolonych). Wpisane formularze mogą przepaść w 1.0, ale token zaproszenia w `sessionStorage` zostaje (s02.10). |
| **L08** | brak stanu | Rejestracja i logowanie z `next=/invite` nie mówią o zaproszeniu. | Czy pokazujemy kontekst zaproszenia? | Tak: `/login` i `/register` z `next=/invite` pokazują „Po zalogowaniu przyjmiesz zaproszenie do roli mentora”. Token nadal tylko w `sessionStorage`, nigdy w `next` (s01.11, s02.11). |
| **L09** | brak treści | „Brak dostępu” nie ma treści ani akcji wyjścia, także dla operatora na `/invite`. | Jaki tekst i jaka akcja? | „Brak dostępu” tylko dla zalogowanej osoby z niewłaściwą rolą; gościa przekierowujemy na `/login`. Tytuł „Nie masz dostępu do tej strony”, zdanie „Ta strona wymaga roli {rola}”, przycisk „Wróć do swojej strony startowej” (→ L03), link „Zaloguj się innym kontem”, który najpierw wylogowuje bieżącą sesję. Operator na `/invite` dostaje osobne zdanie „Zaproszenia przyjmuje konto mentora, nie operatora” (s13). |
| **L10** | brak decyzji | Nie opisano, co widzi mentor po odebraniu roli ani jak wygląda wiersz w tabeli. | Informacja dla mentora? Oznaczenie wiersza? | Brak komunikatu dla mentora w E01 (los rezerwacji rozstrzyga E03). W tabeli status „Przyjęte” zostaje, dochodzi wtórna informacja „rola mentora odebrana”, bez daty (spec nie przechowuje audytu). Bez piątego statusu (s09.6, s11.3, s11.10). |
| **L11** | brak treści | Tekst `?error=` jest opisany tylko dla `github_email_unverified`. | Czy mogę zaproponować pozostałe teksty? | Tak, propozycje tekstów tylko dla nowych kodów, w tonie „Z9”. Ustalone komunikaty `github_email_unverified` i `github_password_disabled` bez zmian. Teksty nie ujawniają danych o koncie (s02.7). **Uwagi:** (1) zasada tonu to w `lekcja-06/tokeny.md` **Z10** („co się stało i co zrobić”), a Z9 dotyczy powiadomień, więc stosuję Z10. (2) Kodu `github_password_disabled` nie ma w spec. Odpowiada mu `?notice=github_linked_password_disabled`, czyli baner na `/account` (s04.7), a nie `?error=`. Traktuję go jako ten baner. |
| **L12** | brak treści | Brak tekstów pustych stanów, nazw statusów i potwierdzenia ponownej wysyłki. | Jak nazwać statusy? Czy mogę zaproponować teksty? | Statusy Oczekuje / Przyjęte / Cofnięte / Wygasło, wyliczane wg reguł spec. Puste stany i potwierdzenia jako propozycje do akceptacji (s04.4, s11.2, s11.3, s12.2). |
| **L13** | brak stanu | Brak CTA po potwierdzeniu e-maila i po resecie oraz akcji dla gościa przy nieważnym linku. | Jakie CTA? | Po potwierdzeniu e-maila zalogowany → „Przejdź do konta” (strona roli), gość → „Zaloguj się”. Po resecie hasła „Zaloguj się” (reset nie loguje). Nieważny link weryfikacyjny: zalogowany z niepotwierdzonym adresem → „Wyślij ponownie”, gość → „Zaloguj się, aby wysłać nowy link” (s05.2, s05.3, s07.3). |
| **L14** | stan bez kryterium | Brak tokenu na `/verify-email` i `/reset-password` nie ma komunikatu. | Ten sam tekst wszędzie? | Wspólny tekst „Link jest nieważny albo wygasł” na `/invite`, `/verify-email` i `/reset-password`. Na `/invite` dopiero wtedy, gdy tokenu nie ma ani w hashu, ani w `sessionStorage`. Na `/verify-email` najpierw sesja: potwierdzony użytkownik bez tokenu widzi „Twój adres jest już potwierdzony” (s05.4, s05.5, s07.7, s08.8). |
| **L15** | konflikt UX | Token resetu jest sprawdzany dopiero przy wysłaniu nowego hasła. | Akceptujesz czy sprawdzamy link wcześniej? | Akceptuję w 1.0. Na `/invite` token jest sprawdzany po kliknięciu „Przyjmij zaproszenie”. Po odmowie ostatecznej wspólny komunikat i czyszczenie `sessionStorage`. Świadomy kompromis (s07.4, s08.3, s08.6). |
| **L16** | brak decyzji | Operator może poprosić o reset hasła mailem, choć odzyskanie ma iść przez CLI. | Reset przez pocztę dla operatora? | Operator na `/forgot-password` dostaje tę samą neutralną odpowiedź, ale bez tokenu i bez maila. Reset operatora tylko przez CLI (s06.7). Wymaga korekty spec (dziś `password-reset/request` nie wyklucza operatora). |
| **L17** | brak stanu | Przy „Zaproszenie jest nieważne” brak wskazówki. | Jaka wskazówka i kanał kontaktu? | „Skontaktuj się z osobą, która wysłała zaproszenie — może wygenerować nowy link.” Bez kanału kontaktu (pytanie do briefu) (s08.6). |
| **L18** | sprzeczność z DS (ton) | „Zostałeś zaproszony” ma formę męską. | Forma neutralna? Zasada dla całego interfejsu? | Forma neutralna jako zasada dla całego interfejsu. Tekst zaproszenia: „Masz zaproszenie do roli mentora w DevMentor. Zaloguj się lub załóż konto, aby je przyjąć.” Do podmiany w spec po lekcji (s08.1). Tekst z L23 poprawiony na neutralny (2026-10-20). |
| **L19** | brak stanu | 409 nie podsuwa logowania ani resetu. | Czy link przy komunikacie? | Przy 409 link „Zaloguj się”. „Nie pamiętasz hasła?” tylko w widoku etapu B, bo reset jest w B wg spec (s01.7). |
| **L20** | brak stanu | API zwraca `revokedPrevious`, ale UI tego nie pokazuje. | Czy operator to widzi? | Tak: panel z linkiem pokazuje „Poprzednie zaproszenie dla tego adresu zostało cofnięte”, gdy `revokedPrevious` jest prawdziwe (s11.6). |
| **L21** | brak decyzji (role) | Brak nawigacji między panelami ról i wspólnego nagłówka, a „Wyloguj” jest tylko na `/account`. | Nagłówek zalogowanego w E01? | Wspólny nagłówek zalogowanego (e01): nazwa, `/account` dla każdego, `/mentor` tylko dla mentora, `/admin/invitations` tylko dla operatora, „Wyloguj” zgodnie z L04. W prototypie oznaczony jako propozycja. Przed implementacją nowe kryterium E01. Ukrywanie linku nie zastępuje bramek ról po stronie serwera. |
| **L22** | kryterium bez ekranu | 17.6 nie ma ekranu w E01 (rezerwacja to E03). | Atrapa „Zarezerwuj” czy test API? | Bez atrapy „Zarezerwuj”. 17.6 zostaje testem API, rezerwacje to E03. |
| **L23** | brak stanu | Osoba A otwiera link weryfikacyjny konta B. | Potwierdzamy B czy prosimy o wylogowanie? | Gdy w URL jest `#token=`, zawsze wysyłamy go do potwierdzenia, niezależnie od sesji A. Po sukcesie: „Potwierdzono adres b@…. To inne konto niż to, które jest teraz zalogowane.” Sesja A bez zmian. „Twój adres jest już potwierdzony” tylko bez tokenu. **Korekta spec i testów** (spec dziś najpierw sprawdza sesję) (s05.1, s05.4, s05.8). |
| **L24** | sprzeczność (spec ↔ `AGENTS.md` ↔ DS) | `CrudForm` ma tylko `text`/`textarea`, a strony `(auth)` potrzebują pól e-mail i hasła. `AGENTS.md` ma stare nazwy grup tras. | Rozszerzamy `CrudForm`? Kiedy zmiana nazw grup? | `CrudForm` rozszerzamy o typy `email`/`password` z `autocomplete` przed formularzami E01 (logowanie: `username` + `current-password`; rejestracja i reset: `email` + `new-password`). Dokumentacja i refaktor DS w etapie 2. Nazwy grup w `AGENTS.md` osobnym commitem po lekcji. |

### Do przeniesienia poza mapę (niczego tu nie zmieniam)

- **Backlog i brief:** #20 (kryteria 20.1 i 20.2 bez allowlisty, osobne „Przyjmij”) i D18/R21 (L02); kanał kontaktu w sprawie nieważnego zaproszenia (L17).
- **Spec E01, korekty:**
  - L23: kolejność sprawdzania tokenu i sesji na `/verify-email` oraz testy;
  - L16: reset przez pocztę bez wysyłki dla operatora;
  - L06: operator bez edycji nazwy;
  - L18: tekst zaproszenia w formie neutralnej;
  - L14: wspólny tekst „Link jest nieważny albo wygasł” zamiast „…lub wygasł” i „Otwórz link…”;
  - L03, L04, L05, L07, L08, L13: cele przekierowań i teksty;
  - L09: treść „Brak dostępu”;
  - L10: informacja „rola mentora odebrana” w liście zaproszeń. Spec jej nie przechowuje, więc źródło danych trzeba ustalić przy implementacji.
- **Nowe kryterium E01:** nagłówek zalogowanego (L21).
- **Design system:** typy `email`/`password` w `CrudForm` (L24, DS01).
- **`AGENTS.md`:** nazwy grup `(mentee)`/`(operator)` osobnym commitem (L24).

## 5. Luki w design systemie

Stan: etap 1 skończony, etap 2 (komponenty bazowe) nie zaczęty. W prototypie każdą lukę zbuduję najprościej z tokenów i oznaczę jako lukę.

| ID | Brak | Potrzebne na | Uwagi |
|---|---|---|---|
| DS01 | Typy pól `email` i `password` w `CrudForm` (z `autocomplete`) | s01, s02, s06, s07, s11 | **decyzja L24:** rozszerzenie przed formularzami E01; logowanie `username` + `current-password`, rejestracja i reset `email` + `new-password`; dokumentacja w etapie 2 |
| DS02 | `Alert` / baner (info, ostrzeżenie, błąd, sukces) | s01.3, s01.11, s02.10–13, s04.3, s04.7, s05, s06.3, s09.2, s11.5–7, s12.1 | najczęściej potrzebny brak |
| DS03 | `Separator` z napisem „lub” | s01, s02 | |
| DS04 | Przycisk OAuth (GitHub) jako link `<a>` | s01, s02 | spec: pełna nawigacja; ikona Github jest w lucide |
| DS05 | Layout stron `(auth)` (wąska karta na środku, publiczne odstępy Z11) | s01, s02, s05–s08 | brak layoutu publicznego i auth |
| DS06 | Shell panelu i nagłówek zalogowanego (e01): nazwa, linki wg ról, aktywna pozycja (Z3), „Wyloguj” | s04, s09–s12 | dziś ręczny header w `app/(admin)/layout.tsx`; e01 jest propozycją (L21) |
| DS07 | `AlertDialog` (potwierdzenie) | s11.10 „Odbierz rolę mentora” | |
| DS08 | Pole tylko do odczytu z „Kopiuj” | s11.5 | |
| DS09 | Toast (`sonner` zaplanowany, niezainstalowany) | „Skopiowano”, „Wysłaliśmy link” | do decyzji: toast czy `Alert` (Z10) |
| DS10 | Warianty `Badge` dla statusów (sukces, ostrzeżenie, neutralny) i wtórna informacja przy statusie | s11.3 (Oczekuje / Przyjęte / Cofnięte / Wygasło + „rola mentora odebrana”), s04 (status e-maila) | dziś default/secondary/destructive/outline/ghost/link |
| DS11 | Wariant „brak dostępu” w `ErrorMessage`: tytuł, zdanie z rolą, przycisk powrotu, link „Zaloguj się innym kontem”, bez „Ponów” | s13 | treść z L09 |
| DS12 | Rozwijany wiersz w `DataTable` | s12.3 | do sprawdzenia, czy `DataTable` to umie |
| DS13 | Prymitywy z 13 znaleziskami `lint:tokens` (m.in. `text-white`, `ring-[3px]`) | wszystkie | do poprawy w etapie 2 |
| DS14 | Żaden komponent nie ma własnej story | — | utrudnia składanie prototypu z „gotowych” kawałków |
| DS15 | Otwarte pytanie z `.ai/runs/2026-10-19-design-system-postep.md` (dawniej `packages/ui/POSTEP.md`): wysokość, promień i fokus kontrolek | wszystkie formularze | prototyp przyjmie wartości z obecnych prymitywów |

## 6. Liczby

- **Ekrany:** 13 (s01–s13), w tym 1 symulacja usługi zewnętrznej (s03) i 3 tylko z etapu B (s03, s06, s07). Do tego 1 element wspólny (e01, propozycja).
- **Stany:** 100 (s01: 12, s02: 13, s03: 3, s04: 10, s05: 8, s06: 7, s07: 7, s08: 9, s09: 7, s10: 4, s11: 12, s12: 6, s13: 2). Po decyzjach przybyło 7 stanów: s01.12, s02.11, s02.12, s02.13, s04.10, s05.8, s06.7. Każdy stan ma źródło w kryterium, spec, PP albo decyzji L01–L24.
- **Scenariusze do przełączania:** 15 (SC-14 jest teraz przełącznikiem A/B).
- **Konta demo:** 8.
- **Luki w specyfikacji:** 24, wszystkie z decyzją, 0 otwartych. Rodzaje: 3 sprzeczności (L02, L18, L24), 1 kryterium bez ekranu (L22), 20 braków stanu, treści albo decyzji. Uwagi do decyzji: 3 (L06, L11 ×2); uwaga L18/L23 rozstrzygnięta 2026-10-20. Pozycje do przeniesienia poza mapę: backlog i brief 2, spec E01 8, nowe kryterium 1, DS 1, `AGENTS.md` 1.
- **Luki w design systemie:** 15.
