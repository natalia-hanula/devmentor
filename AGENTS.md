<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Katalog `.ai/` — pamięć i proces pracy agentów

Wszystkie artefakty pracy AI (specyfikacje, logi przebiegów, wnioski) trzymamy w `.ai/`. Korzystanie z tej struktury jest **obowiązkowe** — nie twórz takich plików w innych miejscach repozytorium (np. w katalogu głównym, `docs/` czy `tmp/`).

```
.ai/
├── specs/                 # specyfikacje SDD w toku (szkice i zatwierdzone, jeszcze niewdrożone)
│   ├── implemented/       # specyfikacje w pełni wdrożone
│   └── archive/           # specyfikacje porzucone lub zastąpione
├── runs/                  # logi autonomicznych przebiegów AI
├── lessons.md             # indeks wniosków — krótkie, jednolinijkowe wpisy
└── lessons/               # dłuższe opisy wniosków, do których linkuje lessons.md
```

### Nazewnictwo plików

- Pliki w `specs/` (w tym w podkatalogach), `runs/` i `lessons/` mają nazwę `YYYY-MM-DD-slug.md`, np. `2026-10-18-rezerwacja-sesji.md`.
- `YYYY-MM-DD` to data utworzenia pliku. Nie zmieniaj jej przy przenoszeniu ani edycji.
- `slug` pisz małymi literami, bez polskich znaków, ze słowami rozdzielonymi myślnikami (`kebab-case`), i ogranicz go do kilku słów.

### Przed rozpoczęciem pracy

1. Przeczytaj `.ai/lessons.md` i otwórz pliki z `.ai/lessons/`, które dotyczą Twojego zadania.
2. Sprawdź `.ai/specs/`, czy zadanie nie ma już specyfikacji. Jeśli ma, traktuj ją jako źródło prawdy dla zakresu i kryteriów akceptacji.

### Specyfikacje (SDD)

- Nowa funkcjonalność lub większa zmiana zaczyna się od specyfikacji w `.ai/specs/`. Kod piszesz dopiero po jej akceptacji przez człowieka.
- Specyfikacja zawiera co najmniej: cel, zakres (co wchodzi, a co nie), wymagania, kryteria akceptacji i otwarte pytania.
- Jeśli podczas implementacji okaże się, że trzeba odejść od specyfikacji, najpierw ją zaktualizuj i zgłoś zmianę człowiekowi.
- Po pełnym wdrożeniu przenieś plik do `.ai/specs/implemented/` za pomocą `git mv`. Specyfikację porzuconą lub zastąpioną przenieś do `.ai/specs/archive/` i dopisz na górze pliku powód (oraz odnośnik do specyfikacji, która ją zastąpiła).

### Logi przebiegów (`runs/`)

- Każdy autonomiczny przebieg (praca bez bieżącego nadzoru człowieka, np. wielokrokowa implementacja, pętla, zadanie w tle) **musi** mieć log w `.ai/runs/YYYY-MM-DD-slug.md`. Utwórz go na początku przebiegu i uzupełniaj na bieżąco, nie dopiero na końcu.
- Log zawiera: cel i powiązaną specyfikację, kolejne kroki z decyzjami i ich uzasadnieniem, napotkane problemy, zmienione pliki, wynik (co działa, co nie, co zostało do zrobienia).
- Jeśli tego samego dnia jest kilka przebiegów o podobnym temacie, rozróżnij je slugiem (np. `-2`).

### Lessons

Zapisuj wnioski, gdy:

- naprawisz błąd, którego przyczyna nie była oczywista;
- odkryjesz pułapkę w stacku, narzędziach lub konwencjach projektu (np. różnice w tej wersji Next.js);
- człowiek poprawi Twoje podejście albo potwierdzi nieoczywistą decyzję — zapisz to od razu, zanim wrócisz do zadania, tak by ten sam błąd się nie powtórzył;
- ustalisz coś, co trzeba pamiętać długoterminowo.

Zasady:

- Każdy wniosek to jednolinijkowy wpis w `.ai/lessons.md` (najnowsze na górze, format opisany w pliku).
- Jeśli wniosek wymaga kontekstu (objawy, przyczyna, rozwiązanie, jak zapobiegać), opisz go w `.ai/lessons/YYYY-MM-DD-slug.md` i podlinkuj z wpisu w indeksie.
- Zanim dodasz nowy wpis, sprawdź, czy podobny już istnieje. Jeśli tak, zaktualizuj go zamiast dublować. Wnioski, które okazały się błędne, usuń.
- Nie zapisuj tego, co wynika wprost z kodu lub historii gita.
- Jeśli wniosek to reguła, którą każdy agent musi stosować zawsze, zaproponuj człowiekowi dopisanie jej do `AGENTS.md`.

## Sposób pracy

### Planowanie

- Zadanie złożone (kilka kroków, wiele plików lub decyzja architektoniczna) zaczynaj od planu: kroki, pliki do zmiany, sposób weryfikacji. Specyfikacja mówi *co* zbudować, plan — *jak*.
- Przy pracy interaktywnej pokaż plan człowiekowi przed implementacją. W autonomicznym przebiegu zapisz go na początku logu w `.ai/runs/`.
- Gdy coś idzie nie tak (rozwiązanie się komplikuje, kolejne poprawki nie pomagają, założenia okazują się błędne), zatrzymaj się i zaplanuj od nowa zamiast brnąć dalej.

### Naprawianie błędów

- Przy zgłoszeniu błędu (opis, logi, nieprzechodzący test) działaj samodzielnie: odtwórz problem, znajdź przyczynę źródłową i napraw ją. Nie maskuj objawów i nie dopytuj o szczegóły, które da się ustalić z kodu lub logów.
- Jeśli rozwiązanie działa, ale jest toporne, zaproponuj prostszą, czystszą wersję, zanim uznasz zadanie za skończone.

### Weryfikacja

Nie uznawaj zmiany za gotową, dopóki nie udowodnisz, że działa:

- uruchom `npm run lint` i `npx tsc --noEmit`, a przy większych zmianach także `npm run build`;
- jeśli w projekcie są testy dotyczące zmienionego kodu, uruchom je; nowa logika powinna dostać testy;
- zmiany w UI sprawdź w działającej aplikacji (`npm run dev`), a nie tylko w kodzie;
- sprawdź zmianę z kryteriami akceptacji specyfikacji;
- raportuj wynik zgodnie z prawdą: jeśli coś nie przeszło albo nie dało się tego sprawdzić, napisz to wprost.

### Subagenci

- Szerokie przeszukiwanie kodu, research i niezależne podzadania zlecaj subagentom, żeby nie zaśmiecać głównego kontekstu. Od subagenta oczekuj wniosków, nie zrzutów plików.
