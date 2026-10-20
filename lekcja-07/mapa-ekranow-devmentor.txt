# Zadanie

Rozpisz mapę ekranów dla przepływu, z którego powstanie klikalny prototyp.
Niczego jeszcze nie buduj. Twoim wynikiem jest plik z mapą i lista luk
w specyfikacji.

# Materiały

- Przepływ: Epik 01, konta i role: logowanie GitHubem i mailem, rejestracja,
  weryfikacja maila, strony startowe ról (mentee, mentor, operator) i brak
  dostępu. Historie #12, #13 i #14 (jeśli w .ai/specs/backlog.md mają inne
  numery, użyj tamtych).
- Brief: .ai/specs/product-brief.md
- Backlog i specyfikacje: .ai/specs/backlog.md i specyfikacja Epiku 01
  (w DevMentorze z paczki: .ai/specs/2026-09-04-accounts-and-roles.md; jeśli
  jej nie ma, znajdź ją w .ai/specs/ i napisz, którą wybrałeś)
- Persony i badania: .ai/specs/research/ (personas.md, jeśli jest, wywiady
  i decyzje)
- Design system: packages/ui (komponenty w packages/ui/src, Storybook w
  packages/ui/.storybook), zasady dla agentów w AGENTS.md
- Gdzie zapisać mapę: lekcja-07/mapa-ekranow.md

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
