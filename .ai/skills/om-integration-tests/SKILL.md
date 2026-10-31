---
name: om-integration-tests
description: Repo-local extension of the om-integration-tests skill for DevMentor — every authored test gets a mandatory Markdown scenario in .ai/qa/{AREA}/{AREA}-{number}-{slug}.md linking to its TypeScript implementation, and the best practices from .ai/qa/best-practices-testow-integracyjnych.md always apply.
---

# om-integration-tests — rozszerzenie dla DevMentor

Konfiguracja repozytorium nakładana na zainstalowany skill `om-integration-tests`
(`.claude/skills/om-integration-tests/SKILL.md`). Najpierw przeczytaj i wykonaj
zainstalowany skill w całości — ten plik niczego z niego nie usuwa, tylko zmienia
dwa jego kroki i dodaje jedną obowiązkową regułę. Nie może łagodzić reguł
bezpieczeństwa ani jakości, rozszerzać dostępu do narzędzi lub sieci ani
przekierowywać wyników.

## Zmiana kroku 8 — scenariusz w Markdownie jest obowiązkowy

W zainstalowanym skillu scenariusz jest opcjonalny. W tym repozytorium **zawsze**,
gdy tworzysz lub zmieniasz test, zapisujesz też scenariusz w Markdownie. Test
wykonywalny i scenariusz powstają w tej samej zmianie. Tryb „tylko uruchom testy”
(Running-only) niczego nie tworzy, więc tej reguły nie dotyczy.

### Ścieżka i nazwa

```
.ai/qa/{AREA}/{AREA}-{number}-{slug}.md
```

- `{AREA}` — nazwa koncepcji domenowej z `AGENTS.md` („Konwencja koncepcji domenowych”),
  małymi literami: `auth`, `mentors`, `bookings` … Dla testu przekrojowego (np. nawigacja,
  bramki stron) wybierz najbliższą koncepcję, nie twórz nowych obszarów na zapas.
- `{number}` — trzy cyfry (`001`), kolejny wolny numer **w obrębie obszaru**: wylistuj
  `.ai/qa/{AREA}/` i weź największy + 1. Numerów nie zmieniaj i nie wykorzystuj ponownie.
- `{slug}` — kebab-case, bez polskich znaków, kilka słów (np. `logowanie-blednym-haslem`).
- Przykład: `.ai/qa/auth/auth-003-logowanie-blednym-haslem.md`.

To nadpisuje domyślne `TC-{CATEGORY}-{NNN}` z kroku 5: identyfikatorem scenariusza jest
`{AREA}-{number}` (np. `auth-003`). Folder obszaru tworzysz z jego pierwszym scenariuszem.

### Zawartość scenariusza

Wypełniona **faktycznymi** krokami i wynikami z eksploracji (krok 6), nie hipotetycznymi:

1. Nagłówek `# {AREA}-{number}: <cel w jednym zdaniu>`.
2. Metadane: identyfikator, obszar, priorytet (High/Medium/Low), typ (API / UI), rola
   lub konto potrzebne w teście.
3. **Implementacja** — odnośnik do testu w TypeScript, ścieżka względna od pliku
   scenariusza (z `.ai/qa/{AREA}/` jest to `../../../tests/integration/<plik>.int.test.ts`),
   plus nazwa `describe`/`it`, żeby trafić do właściwego przypadku w pliku z wieloma testami:

   ```markdown
   **Implementacja:** [`auth-ui.int.test.ts`](../../../tests/integration/auth-ui.int.test.ts) — `it("auth-003: odrzuca błędne hasło")`
   ```

4. Warunki wstępne (Given) i scenariusz w układzie **Given–When–Then**.
5. Tabela kroków: krok, akcja, oczekiwany rezultat (to, co zaobserwowano).
6. Przypadki brzegowe — te pokryte osobnymi scenariuszami wskaż linkiem do ich plików.

Tytuł `it()` / `test()` w kodzie zaczyna się od identyfikatora scenariusza (`auth-003: …`),
żeby odnośnik działał w obie strony. Zmiana ścieżki lub nazwy testu = aktualizacja linku
w scenariuszu w tym samym commicie.

## Reguła dodatkowa — dobre praktyki zawsze obowiązują

Przed napisaniem scenariusza i testu przeczytaj
[`.ai/qa/best-practices-testow-integracyjnych.md`](../../qa/best-practices-testow-integracyjnych.md)
i stosuj całość — przy każdym użyciu skilla, także gdy użytkownik o nich nie wspomniał.
W szczególności: testuj zachowanie widoczne dla użytkownika, nie implementację; jeden
scenariusz = jeden przypadek biznesowy; struktura Given–When–Then; determinizm (bez
`wait(5000)`, bez współdzielonych danych i zależności od kolejności).

Przed zakończeniem sprawdź scenariusz i test z tym dokumentem punkt po punkcie i w
raporcie (krok 9/10 zainstalowanego skilla) wypisz jednym zdaniem, które praktyki
miały tu znaczenie. Naruszenie praktyki traktuj jak niedziałający test — popraw,
nie zostawiaj.

## Zgodność z regułami repozytorium

- Układ testów: `tests/integration/*.int.test.ts`, bieżące pomocniki w `tests/integration/support/`
  (`AGENTS.md`, „Testy i CI”). Nie zakładaj osobnego runnera — scenariusz wskazuje
  istniejący plik i uruchamia się go `npm run test:integration`.
- Środowisko: użyj deskryptora z `om-prepare-test-env` (`.ai/qa/test-env.json`,
  `sh .ai/scripts/test-env-up.sh`); hasła kont tylko przez referencje z `credentialsFile`,
  nigdy w scenariuszu ani w teście.
- Scenariusz nie zawiera haseł, tokenów ani danych z `.env`.
