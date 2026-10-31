# E01-001: Link weryfikacyjny e-maila użyty drugi raz jest odrzucany

- **ID:** E01-001
- **Obszar:** E01 (konta i role) — spec [`2026-10-18-e01-konta-i-role.md`](../../specs/2026-10-18-e01-konta-i-role.md), wymaganie F1 (krok 5 etapu A: weryfikacja e-maila)
- **Priorytet:** High (auth)
- **Typ:** API
- **Rola / konto:** gość (bez sesji) — konto zakładane w teście; operator tylko do odczytu skrzynki outbox
- **Implementacja:** [`email-verification-reuse.int.test.ts`](../../../tests/integration/email-verification-reuse.int.test.ts) — `it("E01-001: link weryfikacyjny użyty drugi raz jest odrzucany jako nieważny")`

## Scenariusz

```gherkin
Given nowe konto ma niepotwierdzony adres e-mail
And operator widzi w skrzynce outbox jedyny link weryfikacyjny do tego adresu
And ktoś potwierdził adres tym linkiem
When ta sama osoba (bez sesji) użyje tego samego linku drugi raz
Then odpowiedź to 400 „Link jest nieważny albo wygasł”
And nie zostaje ustawione żadne ciasteczko sesji
And adres pozostaje potwierdzony, z niezmienioną datą potwierdzenia
And do adresu nie wychodzi żadna nowa wiadomość
```

## Kroki (zaobserwowane na działającej aplikacji)

| # | Akcja | Oczekiwany rezultat |
| --- | --- | --- |
| 1 | `POST /api/auth/register` z nowym adresem | 201, `emailVerified: false` |
| 2 | Operator czyta `GET /api/mail/outbox`; z wiadomości do adresu wyciąga link `/verify-email#token=…` | Dokładnie jedna wiadomość „Potwierdź adres e-mail” |
| 3 | `POST /api/auth/email-verification/confirm` `{ token }` (pierwszy raz, bez sesji) | 200 `{ emailVerified: true, email }`, bez `Set-Cookie` |
| 4 | Ten sam `POST` z tym samym tokenem (drugi raz) | 400, `VALIDATION_ERROR`, „Link jest nieważny albo wygasł”, bez `Set-Cookie` |
| 5 | Odczyt konta z bazy i skrzynki outbox | `emailVerifiedAt` taki sam jak po kroku 3; nadal jedna wiadomość do adresu |

## Przypadki brzegowe

- Drugie użycie zalogowanej osoby z potwierdzonym adresem w UI (akcja „Przejdź do konta”, OP-1) — pokrywa test przeglądarkowy w
  [`email-verification.int.test.ts`](../../../tests/integration/email-verification.int.test.ts) (bez własnego scenariusza).
- Link unieważniony przez „Wyślij ponownie”, token obcy i limit 20 prób na IP — osobne przypadki w tym samym pliku, poza zakresem E01-001.
