# E01-002: Mentee nie ma dostępu do tras zaproszeń zarezerwowanych dla operatora

- **ID:** E01-002
- **Obszar:** E01 (konta i role) — spec [`2026-10-18-e01-konta-i-role.md`](../../specs/2026-10-18-e01-konta-i-role.md), role i autoryzacja tras operatora (zaproszenia mentorów)
- **Priorytet:** High (auth)
- **Typ:** API
- **Rola / konto:** mentee (zalogowany, sesja podpisana sekretem aplikacji testowej) i operator (logowanie przez `/api/auth/login`) — oba konta zakładane w teście
- **Implementacja:** [`invitations-access.int.test.ts`](../../../tests/integration/invitations-access.int.test.ts) — `it("E01-002: mentee dostaje 403 bez danych na trasach zaproszeń operatora i niczego tam nie tworzy")`

> Trasa zaproszeń w kodzie to `/api/auth/invitations` (`packages/app/app/api/auth/invitations/route.ts`), nie `/api/admin/invitations`
> (pod `/admin/invitations` jest tylko strona panelu). „Trasa konta” mentee to `GET /api/auth/me`.

## Scenariusz

```gherkin
Given operator ma na liście jedno oczekujące zaproszenie
And zalogowany jest mentee (bez roli operatora)
When mentee wysyła GET /api/auth/invitations (lista)
And mentee wysyła POST /api/auth/invitations z nowym adresem (utworzenie)
Then oba żądania kończą się 403 „Brak uprawnień” z samą kopertą błędu (bez listy, bez linku)
And ten sam mentee dostaje 200 na GET /api/auth/me
And operator dostaje 200 na GET /api/auth/invitations
And lista zaproszeń operatora jest identyczna jak przed próbą
And w bazie nie ma zaproszenia na adres z próby
```

## Kroki (wynik oczekiwany wg kodu trasy; potwierdzenie biegiem testu — patrz raport z uruchomienia)

| # | Akcja | Oczekiwany rezultat |
| --- | --- | --- |
| 1 | Operator `POST /api/auth/invitations` `{ email }` (stan wyjściowy) | 201 |
| 2 | Operator `GET /api/auth/invitations` | 200, lista zawiera adres z kroku 1 (zapamiętana jako „przed”) |
| 3 | Mentee `GET /api/auth/invitations` | 403, `{ ok: false, error: { code: "FORBIDDEN", message: "Brak uprawnień" } }` |
| 4 | Mentee `POST /api/auth/invitations` `{ email }` (nowy adres) | 403, ta sama koperta błędu |
| 5 | Mentee `GET /api/auth/me` (kontrola pozytywna) | 200 |
| 6 | Operator `GET /api/auth/invitations` (kontrola pozytywna) | 200 |
| 7 | Porównanie listy operatora z krokiem 2 i zapytanie do bazy o adres z kroku 4 | lista `toEqual` „przed”; 0 zaproszeń na ten adres |

## Przypadki brzegowe

- `DELETE /api/auth/invitations?id=` i `DELETE /api/auth/mentor-roles` dla mentee — poza zakresem E01-002 (osobne scenariusze).
- Brak sesji (gość) → 401 zamiast 403 — osobny przypadek.
- Operator na stronie `/invite` (403 z `accept` przed zużyciem tokenu) — pokrywa [`invitations.int.test.ts`](../../../tests/integration/invitations.int.test.ts).
