# Prompt: mapa ekranów

Zanim agent zbuduje choćby jeden ekran, rozpisuje, jakie ekrany i stany wynikają z historii w backlogu. To najtańszy moment, żeby zobaczyć, czego brakuje w specyfikacji.

Uzupełnij tylko blok „Materiały”.

```text
# Zadanie

Rozpisz mapę ekranów dla przepływu, z którego powstanie klikalny prototyp.
Niczego jeszcze nie buduj. Twoim wynikiem jest plik z mapą i lista luk
w specyfikacji.

# Materiały (uzupełnij)

- Przepływ: {{np. Epik 01, konta i role: logowanie GitHubem i mailem,
  rejestracja, weryfikacja maila, strony startowe ról i brak dostępu}}
- Brief: {{ścieżka}}
- Backlog i specyfikacje: {{ścieżki}}
- Persony z lekcji 4: {{ścieżka do personas.md albo „brak”}}
- Design system: {{pakiet, Storybook i plik dla agentów z lekcji 6}}
- Gdzie zapisać mapę: {{np. prototypes/konta-i-role/mapa-ekranow.md}}

# Jak pracujesz

1. Wypisz historie i kryteria akceptacji, które dotyczą tego przepływu,
   z ich numerami.
2. Rozpisz ekrany. Każdy dostaje stały identyfikator (s01, s02 i tak dalej),
   którego potem nie zmieniasz, bo do niego będą przypięte komentarze.
3. Dla każdego ekranu wypisz stany, które go dotyczą: domyślny, pusty,
   ładowanie, błąd, brak dostępu, konflikt (np. konto z tym mailem już istnieje)
   i wynik zewnętrznej usługi (np. GitHub niedostępny). Przy każdym stanie
   podaj historię albo kryterium, z którego wynika.
4. Role: kto widzi ekran (np. mentee, mentor, operator) i co zobaczy ktoś
   niezalogowany albo z inną rolą.
5. Scenariusze do przełączania w prototypie: które wyniki trzeba umieć
   wywołać ręcznie (np. GitHub niedostępny, link z maila wygasł, sesja wygasła).
   To będą kontrolki prototypu, nie funkcje produktu.
6. Dane demo: jakie konta (po jednym na rolę i połączenie ról), jakie dane
   z briefu (nazwy, ceny, terminy) i jaki stały „teraz” dla zegara demo.
   Wszystko fikcyjne.
7. Przy każdym ekranie: z których komponentów design systemu się składa.
   Czego brakuje, wpisz jako lukę w design systemie.
8. Luki w specyfikacji, czyli najważniejsza część:
   - kryterium, które nie ma ekranu albo stanu,
   - stan, którego przepływ potrzebuje, a którego nie opisuje żadne kryterium,
   - sprzeczność między specyfikacją, briefem i design systemem,
   - decyzja, której nikt nie podjął (np. co widzi mentee po anulowaniu).
   Nie rozstrzygaj sam. Przy każdej luce zapisz pytanie do właściciela produktu.
9. Nie dodawaj funkcji, których nie ma w materiałach, nawet jeśli „zwykle są”
   w takich aplikacjach (np. kody rabatowe, rozmowy wideo, oceny). Jeśli
   uważasz, że czegoś brakuje, zapisz to jako pytanie.

# Wynik

Plik mapy, w tym układzie:
1. Tabela: ID | ekran | rola | stany | historia lub kryterium | komponenty DS.
2. Scenariusze do przełączania.
3. Konta i dane demo.
4. Luki w specyfikacji, każda z pytaniem.
5. Luki w design systemie.
6. Liczby: ekrany, stany, luki.

Na koniec zatrzymaj się i poczekaj, aż zatwierdzę mapę.
```
