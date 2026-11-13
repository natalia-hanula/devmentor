# Recenzje speca E01 (Gemini i GPT)

- **Recenzowany spec:** E01 konta i role (`.ai/specs/2026-10-18-e01-konta-i-role.md`), wersja sprzed rewizji 1
- **Data recenzji:** 2026-10-18 (GPT o 16:27 czasu polskiego)
- **Autor speca:** Claude Opus 5.5 (wg trailera commitu `7b45435`)
- **Recenzenci:** Gemini 3.8 Thinking oraz GPT 5.6 Terra
- **Kto zlecił:** Natalia
- **Źródło:** odpowiedzi skopiowane z historii rozmów 2026-11-13

Treść recenzji poniżej jest przepisana dosłownie, bez poprawek i skrótów.

## Recenzja Gemini 3.8 Thinking

Oto lista problemów w specyfikacji, w kolejności od najbardziej krytycznego:

1. Trywialny Denial of Service (DoS) na konta użytkowników i operatora

Cytat: „Limiter [...] `login:email` (bez IP) 10 / 15 min [...] Limiter liczy każdą próbę logowania, nie tylko nieudaną.”

* Co jest nie tak: Globalny limit oparty na samym adresie e-mail pozwala atakującemu na permanentne blokowanie dostępu każdemu użytkownikowi (w tym jedynemu operatorowi) poprzez cykliczne wysyłanie 10 błędnych żądań logowania co kwadrans.

* Propozycja poprawki: Usuń limiter oparty wyłącznie na e-mailu lub zliczaj w nim wyłącznie powiązane z IP udane próby logowania, a ochronę przed atakiem brute-force pozostaw limiterom weryfikującym adres IP.

2. Wyciek tokenów zaproszeń na skutek błędu logiki transakcji (luka bezpieczeństwa)

Cytat: „2. INSERT user_roles (mentor). Naruszenie UNIQUE → rollback całej transakcji (token nie zostaje zużyty) i 409 „Masz już rolę mentora”.”

* Co jest nie tak: Wycofanie transakcji cofa również zużycie tokenu zaproszenia (`UPDATE`), przez co zalogowany użytkownik, który już ma rolę mentora, może otworzyć link, wywołać błąd 409, a następnie przekazać ten wciąż w pełni aktywny link osobie trzeciej.

* Propozycja poprawki: Waliduj posiadanie roli mentora przed rozpoczęciem transakcji (odrzucając żądanie od razu) lub oznaczaj token jako zużyty bez względu na to, czy przypisanie roli wygeneruje konflikt, obsługując ewentualny błąd poza główną transakcją aplikowania zaproszenia.

3. Odcięcie operatora od systemu produkcyjnego (przypadek brzegowy)

Cytat: „Poczta tylko w outboxie, i tylko poza produkcją.” ORAZ „Konto operatora zakłada wyłącznie skrypt CLI.” ORAZ „Kod wyjścia 1, gdy e-mail ma już konto.”

* Co jest nie tak: Jeśli jedyny operator na produkcji zapomni hasła, funkcja resetu nie zadziała (brak wysyłki e-maili na produkcji dla wersji 1.0), a skrypt narzędziowy odmówi działania ze względu na już istniejące konto, bezpowrotnie zamykając dostęp do panelu zarządczego.

* Propozycja poprawki: Zmodyfikuj skrypt CLI tak, by w przypadku wykrycia konta operatora (lub za pomocą specjalnej flagi `--reset`) potrafił on w bezpieczny sposób nadpisać jego dotychczasowe hasło.

4. Wewnętrzna sprzeczność marnująca budżet (architektura)

Cytat: „porównanie ze stałym kosztem dla nieistniejącego konta (atrapa hasha bcrypt), żeby czas odpowiedzi nie zdradzał istnienia konta” ORAZ „409 przy polu email „Ten e-mail ma już konto” (constraint, nie zapytanie wcześniej) [...] Świadomy kompromis”

* Co jest nie tak: Implementowanie kosztownej (zarówno w pisaniu przez jedną osobę, jak i w użyciu CPU serwera) ochrony przed enumeracją kont w procesie logowania jest całkowicie bezcelowe, skoro endpoint rejestracji publicznie i jawnie zwraca informację o istnieniu weryfikowanego e-maila.

* Propozycja poprawki: Zrezygnuj z obsługi "atrapy hasha" i w przypadku nieznalezienia e-maila od razu zwracaj błąd logowania, skracając ścieżkę autoryzacji.

5. Osierocone tokeny weryfikacyjne po przejęciu konta przez OAuth (luka bezpieczeństwa)

Cytat: „Przy łączeniu z kontem o niepotwierdzonym e-mailu usuwamy password_hash i podbijamy session_version, więc hasło napastnika i jego sesje przestają działać.”

* Co jest nie tak: Specyfikacja pomija usunięcie wydanych wcześniej tokenów (np. do zmiany hasła), co oznacza, że napastnik, który przed utratą dostępu wygenerował link resetujący hasło, wciąż będzie mógł z niego skorzystać po przejęciu konta przez właściciela z użyciem GitHuba.

* Propozycja poprawki: Rozszerz proces przejmowania/łączenia niepotwierdzonego konta o twarde usunięcie w bazie wszystkich dotychczas przypisanych do tego `user_id` wierszy w tabeli `user_tokens`.

6. Pułapka braku edycji przy literówce (przypadek brzegowy/UX)

Cytat: „Konto działa od razu, a bramka weryfikacji e-maila stoi dopiero przed pierwszą rezerwacją” ORAZ „Czego nie bierzemy: [...] zmiany e-maila”

* Co jest nie tak: Mentee, który przy szybkiej rejestracji popełni błąd w adresie e-mail, zainwestuje czas w konto, lecz na etapie finalizacji rezerwacji zostanie całkowicie zablokowany bez możliwości potwierdzenia własności adresu i bez możliwości jego poprawienia.

* Propozycja poprawki: Dodaj w komponencie `/account` ograniczoną funkcję edycji adresu e-mail dostępną wyłącznie dla kont, które nie przeszły jeszcze weryfikacji.

7. Niekontrolowany wzrost bazy tokenów (architektura danych)

Cytat: „Nowy token tego samego celu usuwa poprzednie niezużyte” ORAZ „UPDATE … SET used_at = now() WHERE token_hash = ?”

* Co jest nie tak: Zgodnie z modelem danych, wszystkie kliknięte (zużyte) tokeny pozostają w tabeli `user_tokens` na zawsze i nie istnieje żaden proces ich czyszczenia, co z czasem doprowadzi do spuchnięcia relacji z nieistotnymi historycznymi danymi.

* Propozycja poprawki: Zmień operację zużycia tokena z instrukcji `UPDATE` na `DELETE RETURNING user_id` lub zdefiniuj w wymaganiach skrypt/zadanie usuwające wygasłe i zużyte rekordy.

## Recenzja GPT 5.6 Terra

Najgroźniejsze problemy, od najpoważniejszego:

1. Link zaproszenia daje rolę mentora każdemu zalogowanemu posiadaczowi linku.
„link zaproszenia działa dla dowolnego zalogowanego konta”
„może mieć inny e-mail”
Co jest nie tak: wyciek, przekazanie albo zapisanie linku w historii przeglądarki pozwala obcej osobie zdobyć rolę mentora; jednorazowość i 14 dni tylko zmniejszają okno ataku.
Poprawka: Powiąż przyjęcie zaproszenia z kontem o potwierdzonym e-mailu równym `mentor_invitations.email`, a odstępstwa obsługuj wyłącznie jawną akcją operatora.
2. Specyfikacja obiecuje brak sekretów w logach, ale umieszcza je w query stringach.
„`/verify-email?token=` i `/reset-password?token=`”
„`/invite?token=…` → logowanie z `next`”
„Żaden token, hash, hasło, kod OAuth ani sekret klienta nie pojawia się w logach”
Co jest nie tak: obecne `LOG_REDACT_PATHS` opisuje pola obiektów, nie URL-e; tokeny, `code` i `state` mogą trafić do logów Nexta, proxy, APM i historii na kolejnych stronach z `next`.
Poprawka: Przenieś tokeny e-mailowe i zaproszeń do fragmentu URL (`#token=`), a dla callbacku OAuth obowiązkowo redaguj query string na ingressie, w loggerze i APM oraz ustaw `Referrer-Policy: no-referrer`.
3. W produkcji podstawowa ścieżka e-mail + hasło jest faktycznie nieużywalna.
„W produkcji jest adapter `noop`”
„Prawdziwi użytkownicy z kontem e-mail + hasło nie potwierdzą adresu, więc nie zarezerwują”
„Samodzielnie użyteczna: konta działają bez GitHuba.”
Co jest nie tak: rejestracja, reset hasła i wymagana przed rezerwacją weryfikacja nie działają dla realnych użytkowników, więc deklarowana samodzielna użyteczność fazy 1 jest sprzeczna z opisem produkcji.
Poprawka: Przed włączeniem rejestracji e-mailowej w produkcji wymagaj działającego `MailGateway` i testu end-to-end, a do tego czasu ukryj ten wariant logowania.
4. Cykl życia zaproszenia pozwala zostawić kilka aktywnych linków dających tę samą rolę.
„`email` … bez UNIQUE”
„Naruszenie UNIQUE → rollback całej transakcji (token nie zostaje zużyty)”
„token nie zużyty (operator może go cofnąć)”
Co jest nie tak: można utworzyć kilka aktywnych zaproszeń dla tego samego adresu, a po próbie użycia przez osobę już będącą mentorem link nadal pozostaje ważnym uprawnieniem dla innego konta.
Poprawka: Przy tworzeniu atomowo zwracaj albo cofaj istniejące aktywne zaproszenie dla e-maila, a przy konflikcie roli kończ bieżące zaproszenie jako zużyte lub cofnięte.
5. Reguła „działa tylko ostatni link” nie jest wymuszona atomowo.
„Nowy token tego samego celu usuwa poprzednie niezużyte, więc działa tylko ostatni link.”
`token_hash` ma UNIQUE, ale nie ma ograniczenia dla aktywnego `(user_id, purpose)`.
Co jest nie tak: dwa równoczesne resendy/reset requests mogą zakończyć się dwoma ważnymi tokenami, bo opis nie wymaga transakcji ani blokady chroniącej tę regułę.
Poprawka: Unieważniaj i twórz token w jednej transakcji z blokadą per `(user_id, purpose)` oraz wymuś w bazie najwyżej jeden aktywny token danego celu.
6. Świadoma enumeracja kont ma limiter, który nie ma zdefiniowanego wiarygodnego źródła IP.
„409 … ‘Ten e-mail ma już konto’”
„`register:ip | 5 / h`”
„IP z `x-forwarded-for` da się podrobić”
Co jest nie tak: spec ujawnia istnienie konta, lecz nie określa bezpiecznego sposobu wyznaczania IP dla `register:ip`; implementacja oparta o klientowski `X-Forwarded-For` pozwoli łatwo obejść jedyną ochronę.
Poprawka: Zwracaj nierozróżnialną odpowiedź przy rejestracji albo dodaj limit `register:email` niezależny od IP i pobieraj IP wyłącznie z zaufanego proxy.
7. Zakres nie ma realnego cięcia dla jednej osoby i budżetu 25 godzin.
„Faza 1” obejmuje konta, sesje, limiter, weryfikację, reset i CLI; potem dochodzą PKCE, własny adapter GitHuba, stub HTTP, panel zaproszeń i 20 kroków implementacji z testami integracyjnymi.
Co jest nie tak: przy takim zakresie brak jasno wyciętego MVP oznacza, że najpewniej ucierpią właśnie testy autoryzacji, migracji lub scenariusze odmowy.
Poprawka: Zatwierdź 1.0 jako mały pionowy slice z realną pocztą i minimalnym zaproszeniem mentora, a GitHub OAuth oraz rozbudowane UI i testy stubów przenieś do osobnych story.

Wdrażałbym tę specyfikację bez zmian — nie.

## Co zrobiono z uwagami

Na podstawie speców `.ai/specs/2026-10-18-e01-konta-i-role.md` (dalej „E01”) i `.ai/specs/2026-10-18-platform-primitives.md` (dalej „PP”) oraz logów w `.ai/runs/`. Numery linii według stanu z 2026-11-13. Logi w `.ai/runs/` nie wspominają rewizji 1 ani tych recenzji: run E01 zaczyna się 2026-10-20 od speca w rewizji 4.

| Uwaga | Co z nią zrobiono | Gdzie to widać |
|---|---|---|
| Gemini 1 — DoS przez limiter `login:email` | przyjęta, w zmienionej formie: w rew. 1 limit liczy tylko porażki, w rew. 2 usunięty całkowicie | E01 Revision log rew. 1 pkt 1 (`:447`) i rew. 2 (`:448`); decyzja R1-1 (`:366`); Risks „Rozproszone zgadywanie hasła jednego konta” (`:319`) |
| Gemini 2 — rollback przy „już mentor” zostawia aktywny token | przyjęta | E01 rew. 1 pkt 2; decyzja R1-1 (`:366`); Risks „Link zaproszenia na okaziciela (Q15)” — „jednorazowy (także przy „już mentor”)” (`:322`); wdrożenie: rew. 12 pkt 3 (`alreadyMentor` zużywa zaproszenie, `:469`) |
| Gemini 3 — operator bez możliwości odzyskania hasła | przyjęta; wdrożenie odłożone do etapu B | E01 rew. 1 pkt 4; decyzja R1-1 (`:366`); Proposed Solution (`:34`); rew. 4 (G9: CLI reset w etapie B, `:457`); Phasing (`:391`, `:397`); rew. 9 (`--reset-password` w etapie A → kod 1, `:466`) |
| Gemini 4 — usunąć atrapę hasha bcrypt | odrzucona | E01 rew. 1 „Odrzucone: … usunięcie atrapy hasha”; tabela „Odrzucone w przeglądzie (rewizja 1)” (`:373`) |
| Gemini 5 — tokeny po łączeniu konta z GitHubem | przyjęta; wdrożenie razem z GitHub OAuth (F2) w etapie B | E01 rew. 1 pkt 3; rew. 4 (G9, `:457`); Phasing etap B — F2 (`:391`) |
| Gemini 6 — brak poprawy literówki w e-mailu | przyjęta; wdrożenie odłożone do etapu B | E01 rew. 1 pkt 10; decyzja Q14 (wyjątek z rewizji 1, `:343`); rew. 4 (G9, `:457`); Phasing etap B „5b zmiana niepotwierdzonego adresu” (`:391`) |
| Gemini 7 — zużyte tokeny zostają w tabeli | przyjęta | E01 rew. 1 pkt 7; wdrożenie: rew. 8 pkt 5 (`DELETE … RETURNING`, `:465`) |
| GPT 1 — wiązać zaproszenie z e-mailem | odrzucona | E01 rew. 1 „Odrzucone: wiązanie zaproszenia z e-mailem”; tabela odrzuconych (`:372`); decyzja Q15 (`:340`); Risks „Link zaproszenia na okaziciela (Q15)” (`:322`), uzupełnione w rew. 13 pkt 3 (`:470`) |
| GPT 2 — tokeny w query stringach | przyjęta (tokeny e-mailowe i zaproszeń we fragmencie URL, redakcja `url` w logach, `Referrer-Policy`); `Referrer-Policy` odłożona do etapu B; redakcja query stringu callbacku OAuth na ingressie i w APM — nie ustalono | E01 rew. 1 pkt 8; decyzja R1-1 (`:366`); „Tokeny w linkach — fragment URL, nie query string” (`:75`); kryterium akceptacji (`:440`); PP rew. 1 (`url`, `*.url` w `LOG_REDACT_PATHS`, PP `:344`); Phasing etap B (`:391`) |
| GPT 3 — ścieżka e-mail + hasło nieużywalna w produkcji | przyjęta, w zmienionej formie: zamiast ukrycia wariantu — warunek startu (poczta + test e2e) i ostrzeżenie na `/register` przy `noop`; ostrzeżenie odłożone do etapu B | E01 rew. 1 pkt 13; decyzja R1-1 (`:366`); rew. 3 (G1, `:449`); Risks „1.0 kursowe = lokalnie lub staging z outboxem” (`:317`) i „Warunek startu z prawdziwymi użytkownikami” (`:318`); PP rew. 1 (`isMailDeliveryAvailable`, PP `:344`); Phasing etap B (`:391`) |
| GPT 4 — kilka aktywnych zaproszeń na ten sam adres | przyjęta | E01 rew. 1 pkt 5 (jedno aktywne na adres) i pkt 2 (konflikt roli zużywa token); decyzja R1-1 (`:366`); wdrożenie: rew. 12 pkt 1 (`:469`) |
| GPT 5 — „działa tylko ostatni link” bez atomowości | przyjęta | E01 rew. 1 pkt 6 (upsert po UNIQUE `user_id`, `purpose`) |
| GPT 6 — enumeracja i niepewne źródło IP | przyjęta w części `register:email` (3/h); jednakowa odpowiedź przy rejestracji odłożona do warunku startu; zaufane źródło IP — wprowadzone później (E01 rew. 6, PP rew. 12–13), ale jego związek z tą recenzją: nie ustalono | E01 rew. 1 pkt 9; decyzja R1-1 (`:366`); rew. 3g (G8, `:456`); decyzja G8 (`:347`); Risks „Enumeracja kont przy rejestracji” (`:321`), w tym skutek uboczny `register:email` z rew. 13 pkt 3; E01 rew. 6 (`:463`, źródło: decyzja 16 runu); PP rew. 12 (PP `:356`, źródło: review fazy 2) i rew. 13 (PP `:357`) |
| GPT 7 — zakres za duży na 25 h | odrzucona (zakres faz bez zmian, zmieniona tylko kolejność wdrożenia F1 → F3 → F2) | E01 rew. 1 „Odrzucone: … zmiana zakresu faz”; tabela odrzuconych (`:374`). Później rew. 4 (G9, grill-me, `:457`) dzieli kroki na etapy A/B; czy wynika to z tej uwagi — nie ustalono |

Rewizja 1 zawiera też dwa punkty bez odpowiednika w tych recenzjach: pkt 11 (komunikat po łączeniu z GitHubem z wyłączonym hasłem) i pkt 12 (`/verify-email` → „już potwierdzony” dla zalogowanego). Ich źródło: nie ustalono (wiersz rew. 1 podaje łącznie „Przegląd Gemini i GPT + uwagi Natalii”).
