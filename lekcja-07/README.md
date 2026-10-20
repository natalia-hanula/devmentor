# Lekcja 07: materiały do ćwiczeń

Ćwiczenia robisz na swoim projekcie albo na DevMentorze, a ścieżki z DevMentora są przykładami. Mapa ekranów i prototyp z design systemu dotyczą Epiku 01 DevMentora (konta i role, historie #12, #13 i #14; numery z Twojego backlogu są w `.ai/specs/backlog.md`) albo pierwszego epiku Twojego backlogu. Szary prototyp i persony sprawdzają dołączanie mentora, które wychodzi poza Epik 01. Agenta uruchamiasz w katalogu głównym projektu. Przed lekcją zainstaluj albo odśwież skille Open Mercato, tak jak w lekcji 3:

```bash
npx skills add open-mercato/skills --skill '*'
```

Potem sprawdź w Claude Code `/skills`: muszą być `om-mockup-prototype` i `om-synthetic-users`. Jeśli nowych komend nie widać, uruchom Claude Code ponownie.

Przed każdym ćwiczeniem wpisz w Claude Code `/clear`. Prompt z pliku kopiujesz w całości (Cmd+A i Cmd+C, na Windowsie i Linuksie Ctrl+A i Ctrl+C) i wklejasz.

## Czy skille mają przeglądarkę

Sprawdź to przed ćwiczeniem 2a:

```bash
grep -A1 '"browser"' .ai/agentic.config.json; ls .ai/browsers/
```

Jeśli w obu miejscach widzisz `agent-browser`, skille spróbują przejść prototyp w przeglądarce i zapisać zrzuty. Jeśli przeglądarki nie ma albo nie da się jej uruchomić, `om-mockup-prototype` kończy z `Verification: not-run`, a `om-synthetic-users` przechodzi przepływ na papierze, z opisu w briefie albo specyfikacji, i mówi o tym w raporcie. Oba wyniki są poprawne.

## Ćwiczenie 1: mapa ekranów Epiku 01

- `mapa-ekranow-devmentor.txt`: prompt „Mapa ekranów” z blokiem „Materiały” wypełnionym dla DevMentora. Agent wypisuje ekrany, sytuacje, role, konta testowe i to, czego brakuje w specyfikacji, a potem czeka na zatwierdzenie.
- Na końcu agent zadaje pytania o luki. Odpowiadasz Ty, potem zatwierdzasz mapę.
- Wynik: `lekcja-07/mapa-ekranow.md`.

## Ćwiczenie 2a: szary prototyp skillem

- `szary-prototyp-polecenie.txt`: polecenie dla `om-mockup-prototype` z przepływem dołączania mentora z briefu.
- Skill pokazuje plan w rozmowie i czeka na potwierdzenie. Potem buduje prototyp i zapisuje plan w `README.md` w folderze wersji.
- Wynik: `.ai/prototypes/discovery/mentor-onboarding/revision-001/`.
- Nowa wersja: `/om-mockup-prototype --refresh .ai/prototypes/discovery/mentor-onboarding/revision-001`. Powstaje `revision-002`, a `revision-001` zostaje bez zmian. Jeśli drugi raz uruchomisz polecenie z `szary-prototyp-polecenie.txt`, skill zaproponuje `--refresh` albo wybierze nowy folder i poda jego nazwę. Wtedy podmień ścieżkę w prompcie „Szary prototyp w podglądzie Storybooka” i w ćwiczeniach 2b i 3.
- Podgląd: wklej agentowi prompt „Szary prototyp w podglądzie Storybooka” z `szary-prototyp-w-storybooku.txt`. Agent skopiuje cały folder wersji do folderu, z którego Storybook serwuje pliki (w DevMentorze `packages/ui/.storybook/public/prototypes/szary/`), i wyłączy kopie z gita i z lintu. Potem zatrzymaj aplikację (Ctrl+C) i uruchom Storybook na porcie 3000 (polecenie dla DevMentora; na swoim projekcie wejdź do katalogu ze Storybookiem):

  ```bash
  cd packages/ui && npx storybook dev --config-dir .storybook --host 0.0.0.0 --port 3000 --no-open --ci --disable-telemetry
  ```

  Jeśli port 3000 jest zajęty, Storybook bez pytania wybierze inny i wypisze go w terminalu. Wtedy zatrzymaj aplikację i uruchom Storybook jeszcze raz. Prototyp otworzysz w zakładce Web pod `/prototypes/szary/index.html` (lokalnie `http://localhost:3000/prototypes/szary/index.html` albo z portem 6006, jeśli uruchamiasz Storybook jak w lekcji 6). Do aplikacji wracasz tak: Ctrl+C, `cd ../..` i `npm run dev`.

## Ćwiczenie 2b: Epik 01 z design systemu

- `klikalny-prototyp-devmentor.txt`: prompt „Klikalny prototyp z design systemu” z blokiem „Materiały” wypełnionym dla DevMentora. Potrzebuje mapy z ćwiczenia 1 i szarego prototypu z ćwiczenia 2a. Pracuje etapami i po każdym czeka na „dalej”. Postęp zapisuje w `prototypes/konta-i-role/POSTEP.md`.
- Na lekcji: etap 0 (plan) i etap 1 (pierwsza ścieżka). Etapy 2 i 3 to zadanie domowe.
- Podgląd: `/prototypes/konta-i-role/index.html` w zakładce Web, przy włączonym Storybooku z ćwiczenia 2a.
- `silnik-przegladu/`: tryb komentarzy, mapa ekranów i eksport uwag do repozytorium. Instrukcja w `silnik-przegladu/README.md`.

### Poprawka komentarzem

1. W pasku przeglądu włącz „Comment”, kliknij element i wpisz uwagę.
2. Otwórz „Threads” i wybierz „Export Markdown”. Przeglądarka pobierze na Twój komputer plik `prototype-feedback.md`.
3. Skopiuj jego treść, wklej do Claude Code i dopisz polecenie z `poprawka-komentarzem.txt`.
4. Odśwież prototyp i porównaj przed i po.

## Ćwiczenie 3: persony przechodzą prototyp (opcjonalne)

- `persony-polecenie.txt`: polecenie dla `om-synthetic-users` w trybie validate. Persony przechodzą szary prototyp dołączania mentora z ćwiczenia 2a, a nie prototyp Epiku 01 z ćwiczenia 2b: dwie persony, dwa przebiegi. Na własnym produkcie podmień w poleceniu ścieżkę do szarego prototypu i `--flow` na swoje. Jeśli masz nowszą wersję szarego prototypu, podmień `revision-001` na jej numer.
- Skill pokazuje skład panelu i czeka na „tak”. Potem pracuje sam, u mnie trwało to około kwadransa.
- Wynik: `report.md` w nowym folderze w `.ai/specs/research/walkthroughs/`. Skill zapisuje też `personas.md` i `calibration.md` w `.ai/specs/research/`. Jeśli nie ma tam wywiadów, cechy person bez źródła oznaczy jako `[ASSUMPTION]` i napisze o tym w raporcie.

## Decyzje do specyfikacji

Decyzje z mapy, uwagi z komentarzy i wyniki person wpisujesz do specyfikacji promptem „Decyzje do specyfikacji” z `prompty/prompt-decyzje-do-specyfikacji.md`. Agent pokazuje listę zmian i czeka na Twoją zgodę.

## Od nowa

Żeby zrobić ćwiczenia jeszcze raz od zera, przenieś poprzednie wyniki poza repozytorium:

```bash
bash lekcja-07/wyczysc-wyniki.sh
```

Skrypt niczego nie kasuje. Przenosi mapę ekranów, oba prototypy, podgląd, raport person oraz pliki `personas.md` i `calibration.md` do folderu `~/lekcja-07-wyniki-…` i pokazuje `git status`.

## Prompty

- `prompty/prompt-mapa-ekranow.md`: prompt „Mapa ekranów” do uzupełnienia na własnym produkcie
- `prompty/prompt-klikalny-prototyp.md`: prompt „Klikalny prototyp z design systemu” do uzupełnienia na własnym produkcie
- `prompty/prompt-decyzje-do-specyfikacji.md`: prompt „Decyzje do specyfikacji”, czyli decyzje z mapy, komentarzy i person do specyfikacji
