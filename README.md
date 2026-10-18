# DevMentor

**DevMentor** to marketplace mentoringowy dla programistów. Łączy doświadczonych mentorów z uczniami, którzy chcą rozwijać swoje umiejętności — od pierwszych kroków w programowaniu po przygotowanie do rozmów rekrutacyjnych i awans na wyższe stanowisko.

> Projekt powstaje w ramach kursu **AI Tech Leaders** i jest rozwijany z pomocą **Claude Code**.

## Funkcjonalności

- **Mentorzy** — publiczne profile z doświadczeniem, technologiami, stawką i dostępnością.
- **Uczniowie** — konta osób szukających wsparcia, z celami nauki i historią sesji.
- **Profile** — przeglądanie i wyszukiwanie mentorów po technologiach, poziomie i cenie.
- **Umawianie sesji** — rezerwacja terminów w kalendarzu mentora.
- **Wiadomości** — komunikacja między mentorem a uczniem przed sesją i po niej.
- **Płatności** — opłacanie sesji bezpośrednio na platformie.

> Projekt jest na wczesnym etapie — powyższa lista opisuje docelowy zakres, nie stan obecny.

## Stack technologiczny

- [Next.js](https://nextjs.org) 16 (App Router)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [GitHub](https://github.com/natalia-hanula/devmentor) — repozytorium i kontrola wersji
- [Claude Code](https://claude.com/claude-code) — asystent AI wspierający development

## Uruchomienie lokalne

Wymagania: Node.js 20+ i npm.

```bash
git clone https://github.com/natalia-hanula/devmentor.git
cd devmentor
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

## Dostępne skrypty

| Skrypt          | Opis                                  |
| --------------- | ------------------------------------- |
| `npm run dev`   | Serwer deweloperski z hot reloadem    |
| `npm run build` | Build produkcyjny                     |
| `npm run start` | Uruchomienie buildu produkcyjnego     |
| `npm run lint`  | Sprawdzenie kodu ESLintem             |

## Struktura projektu

```
app/        # strony i layouty (Next.js App Router)
public/     # zasoby statyczne
```

## O projekcie

DevMentor jest projektem edukacyjnym realizowanym w trakcie kursu **AI Tech Leaders**. Celem jest praktyczne przećwiczenie budowy produktu z wykorzystaniem narzędzi AI — w szczególności Claude Code — na każdym etapie: od planowania, przez implementację, po code review.
