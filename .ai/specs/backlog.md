# Backlog

Mapa źródło → issues tworzona przez `om-backlog`. Tracker jest źródłem prawdy; ten plik trzyma mapowanie i zarezerwowane id. Jedna sekcja na `Backlog source:`.

## Backlog source: .ai/specs/product-brief.md

- Utworzono: 2026-10-18 (decyzje D17–D23 przed filingiem)
- Prefiks: `E`; zarezerwowane id: E00–E06 i wszystkie poniżej; wycofanych: brak
- Ścieżka krytyczna: E01-S01 (#17) → E01-S02 (#20) → E02-S01 (#21) → E02-S02 (#22) → E03-S01 (#25) → E03-S02 (#26) → E03-S03 (#29) → E04-S02 (#31) → E04-S03 (#32) → E05-S01 (#34)

| Id | Issue | Tytuł | Rodzaj | Rodzic | Depends on | Priority / risk |
|---|---|---|---|---|---|---|
| E00 | [#10](https://github.com/natalia-hanula/devmentor/issues/10) | Discovery — test podaży i wywiady (Research — bez kodu) | epic | — | — | medium / low |
| E01 | [#11](https://github.com/natalia-hanula/devmentor/issues/11) | Konto, logowanie i rola mentora | epic | — | — | medium / high |
| E02 | [#12](https://github.com/natalia-hanula/devmentor/issues/12) | Oferta mentora: profil, cena, terminy, katalog | epic | — | — | medium / high |
| E03 | [#13](https://github.com/natalia-hanula/devmentor/issues/13) | Rezerwacja i przedpłata | epic | — | — | medium / high |
| E04 | [#14](https://github.com/natalia-hanula/devmentor/issues/14) | Sesja tekstowa i rozliczenie | epic | — | — | medium / high |
| E05 | [#15](https://github.com/natalia-hanula/devmentor/issues/15) | Pomiar testów podaży i popytu | epic | — | — | medium / high |
| E06 | [#16](https://github.com/natalia-hanula/devmentor/issues/16) | Later (parkowane, bez stories) | epic | — | — | low / low |
| E01-S01 | [#17](https://github.com/natalia-hanula/devmentor/issues/17) | Mentee lub mentor zakłada konto e-mailem i hasłem albo przez GitHub i jest zalogowany | story | E01 | — | medium / high |
| E01-S01-T01 | [#18](https://github.com/natalia-hanula/devmentor/issues/18) | Rejestracja i logowanie e-mailem i hasłem | task | E01-S01 | — | medium / high |
| E01-S01-T02 | [#19](https://github.com/natalia-hanula/devmentor/issues/19) | Logowanie i rejestracja przez GitHub OAuth | task | E01-S01 | E01-S01-T01 (#18) | medium / high |
| E01-S02 | [#20](https://github.com/natalia-hanula/devmentor/issues/20) | Operator zaprasza mentora, a zaproszony po zalogowaniu ma rolę mentora | story | E01 | E01-S01 (#17) | medium / high |
| E02-S01 | [#21](https://github.com/natalia-hanula/devmentor/issues/21) | Mentor publikuje profil z linkiem do publicznej pracy i dostaje własny link do profilu | story | E02 | E01-S02 (#20) | medium / high |
| E02-S02 | [#22](https://github.com/natalia-hanula/devmentor/issues/22) | Operator ustala widełki, a mentor ustawia cenę sesji 25 i 50 min w ich zakresie | story | E02 | E02-S01 (#21) | medium / high |
| E02-S03 | [#23](https://github.com/natalia-hanula/devmentor/issues/23) | Mentor publikuje terminy 25 lub 50 min, które mentee może zarezerwować | story | E02 | E02-S01 (#21) | medium / high |
| E02-S04 | [#24](https://github.com/natalia-hanula/devmentor/issues/24) | Mentor decyduje o obecności w katalogu, a mentee przegląda katalog mentorów, którzy się zgodzili | story | E02 | E02-S01 (#21) | medium / high |
| E03-S01 | [#25](https://github.com/natalia-hanula/devmentor/issues/25) | Mentee wchodzi z linku mentora lub z katalogu i widzi profil, cenę i wolne terminy; wejście zapisuje się ze źródłem | story | E03 | E02-S02 (#22), E02-S03 (#23) | medium / high |
| E03-S02 | [#26](https://github.com/natalia-hanula/devmentor/issues/26) | Mentee rezerwuje termin z opisem problemu i płaci z góry | story | E03 | E01-S01 (#17), E03-S01 (#25) | medium / high |
| E03-S02-T01 | [#27](https://github.com/natalia-hanula/devmentor/issues/27) | Port płatności PaymentGateway z adapterem mock | task | E03-S02 | — | medium / high |
| E03-S02-T02 | [#28](https://github.com/natalia-hanula/devmentor/issues/28) | Adapter Stripe w trybie testowym (nieblokujący 1.0) | task | E03-S02 | E03-S02-T01 (#27) | low / high |
| E03-S03 | [#29](https://github.com/natalia-hanula/devmentor/issues/29) | Mentor lub mentee odwołuje rezerwację, a zwrot liczy się według reguł | story | E03 | E03-S02 (#26) | medium / high |
| E04-S01 | [#30](https://github.com/natalia-hanula/devmentor/issues/30) | Mentor i mentee prowadzą sesję tekstową na ekranie sesji w DevMentorze | story | E04 | E03-S02 (#26) | medium / high |
| E04-S02 | [#31](https://github.com/natalia-hanula/devmentor/issues/31) | Nieobecność mentora zwraca mentee pełną kwotę, a nieobecność mentee zostawia zapłatę mentorowi | story | E04 | E04-S01 (#30), E03-S03 (#29) | medium / high |
| E04-S03 | [#32](https://github.com/natalia-hanula/devmentor/issues/32) | Mentor podłącza Stripe Connect przed pierwszą wypłatą i dostaje cenę pomniejszoną o 20% prowizji | story | E04 | E03-S02 (#26), E04-S02 (#31) | medium / high |
| E04-S03-T01 | [#33](https://github.com/natalia-hanula/devmentor/issues/33) | Onboarding Stripe Connect i wypłaty w porcie płatności (adapter mock) | task | E04-S03 | — | medium / high |
| E05-S01 | [#34](https://github.com/natalia-hanula/devmentor/issues/34) | Operator pobiera cotygodniowe zestawienie terminów, cen, rezerwacji ze źródłem, płatności, odwołań i wejść bez rezerwacji | story | E05 | E03-S01 (#25), E03-S02 (#26), E04-S03 (#32) | medium / high |
| E00-T01 | [#35](https://github.com/natalia-hanula/devmentor/issues/35) | Zaprosić 20 mentorów i zebrać deklaracje ceny, dostępności i zgody na katalog (Research — bez kodu) | research | E00 | — | medium / low |
| E00-T02 | [#36](https://github.com/natalia-hanula/devmentor/issues/36) | Przeprowadzić wywiady z mentorami, którzy odmówili lub nie odpowiedzieli (Research — bez kodu) | research | E00 | E00-T01 (#35) | medium / low |
| E00-T03 | [#37](https://github.com/natalia-hanula/devmentor/issues/37) | Prowadzić cotygodniowe wywiady i eksport po starcie 1.0 (Research — bez kodu) | research | E00 | E05-S01 (#34) | medium / low |

## Notatka startowa (lekcja 04, zadanie domowe)

- **Pierwsze zadanie: E01-S01 (#17).** Nie ma zależności, a wszystko inne (mentor, slot, rezerwacja, płatność) wymaga konta.
- **Największe niewiadome przed startem:**
  - czy 20 mentorów odpowie na zaproszenia (#35, D09 etap 1);
  - realne widełki cen (D17 oparte na ankiecie, nie na transakcjach);
  - wykrywanie no-show po samych wiadomościach (D22).
