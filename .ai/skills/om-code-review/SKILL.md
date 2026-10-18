---
name: om-code-review
description: Repo-local extension of the om-code-review skill for DevMentor — adds two mandatory blocker checks to the review report (package dependency direction app → core → db, and no raw fetch outside the sanctioned HTTP layer).
---

# om-code-review — rozszerzenie dla DevMentor

Konfiguracja repozytorium nakładana na zainstalowany skill `om-code-review`
(`.claude/skills/om-code-review/SKILL.md`; dla innych agentów ta sama treść w
`.agents/skills/om-code-review/SKILL.md`). Najpierw przeczytaj i wykonaj
zainstalowany skill w całości — ten plik niczego z niego nie usuwa, tylko dodaje
dwie obowiązkowe kontrole. Nie może łagodzić reguł bezpieczeństwa ani jakości,
rozszerzać dostępu do narzędzi lub sieci ani przekierowywać wyników.

Źródła reguł: `AGENTS.md` („Reguły zależności”, „Wspólna warstwa API i UI”),
`.ai/docs/engineering-standards.md` („Architecture”, „Reusable API & UI Layer”,
„Code Review Checklist → Structure & conventions”), `eslint.config.mjs`.
Przy sprzeczności wygrywa `AGENTS.md`.

## Kiedy uruchomić

W kroku 5 zainstalowanego skilla („Run the checklists”), na tym samym zakresie
diffu co reszta review. Obie kontrole wykonuj zawsze — także gdy `npm run lint`
przeszedł, bo ESLint można obejść (`eslint-disable`, zmiana `eslint.config.mjs`,
ścieżka względna, klient HTTP z npm, nowy plik poza globami reguł).

Linie dodane w diffie, w formacie `plik:linia:treść` (`$MERGE_BASE` = merge-base
z `$BASE_BRANCH`; bez drugiego argumentu obejmuje też niezacommitowane zmiany):

```bash
added_lines() {
  git diff -U0 "$MERGE_BASE" -- packages scripts tests eslint.config.mjs |
    awk '/^\+\+\+ /{f=($2=="/dev/null")?"":substr($2,3); next}
         /^@@/{split($3,a,/[+,]/); n=a[2]; next}
         /^\+/{if(f!="") print f":"n":"substr($0,2); n++}'
}
```

Raportuj wyłącznie naruszenia w liniach dodanych lub zmienionych przez diff.
Naruszenie istniejące wcześniej, które diff tylko dotyka, zgłoś jako **Minor**
z dopiskiem „istniejące przed zmianą”.

## Kontrola 1 — kierunek zależności między pakietami

Dozwolony kierunek: `app → core → db` oraz `app → ui`. Każdy import w drugą
stronę lub z pominięciem warstwy to **Blocker**:

| Pakiet źródłowy (ścieżka pliku) | Może importować | Blocker, gdy importuje |
| --- | --- | --- |
| `packages/app/**` | `@devmentor/core`, `@devmentor/ui` | `@devmentor/db` (pominięcie `core` — dane tylko przez `withScope`) |
| `packages/core/**` | `@devmentor/db` | `@devmentor/app`, `@devmentor/ui`, `next`, `react` |
| `packages/db/**` | — | dowolny `@devmentor/*` |
| `packages/ui/**` | — | dowolny `@devmentor/*` |

Dotyczy też testów w `packages/<pakiet>/test/**` (ESLint obejmuje cały pakiet).

Co sprawdzić w liniach dodanych:

```bash
added_lines | grep -E '^packages/' |
  grep -E "(from|import\(|require\()\s*['\"](@devmentor/(app|core|db|ui)|[./]+.*/(app|core|db|ui)/src/)"
```

- dopasuj pakiet źródłowy (drugi segment ścieżki) do tabeli; import, którego nie
  ma w kolumnie „Może importować”, to blocker;
- import ścieżką względną lub do `…/<pakiet>/src/` zamiast przez nazwę pakietu
  to blocker, nawet gdy kierunek jest poprawny (omija `exports` i ESLint);
- nowy wpis `@devmentor/*` w `dependencies`/`devDependencies` w
  `packages/<pakiet>/package.json` niezgodny z tabelą to blocker;
- osłabienie reguł `no-restricted-imports` w `eslint.config.mjs` albo
  `eslint-disable` dla nich w kodzie to blocker.

Przykład wpisu w **⛔ Blocker**:

```markdown
- `packages/core/src/services/bookings/booking.service.ts:4` — `core` importuje
  `@devmentor/ui/components/bookings/booking-card` → odwraca kierunek
  `app → core → db` (AGENTS.md, „Reguły zależności”) → przenieś kształt do
  `core` albo przekaż dane z `app`; `ui` nie może być zależnością `core`.
```

## Kontrola 2 — zakaz surowego `fetch` poza warstwą HTTP

Zgodnie z `.ai/docs/engineering-standards.md` („Reusable API & UI Layer”, checklist
review: „Fetch through `apiCall`/`apiCallOrThrow` — never a raw `fetch`”) jedyne
miejsca, w których kod produkcyjny może wywołać `fetch`:

- `packages/ui/src/backend/api/api-call.ts` — wszystkie wywołania `/api/*` z
  przeglądarki; reszta kodu używa `apiCall`/`apiCallOrThrow`;
- `packages/core/src/services/<koncepcja>/adapters/*.ts` — wyłącznie wywołania
  zewnętrznego dostawcy za portem `<Nazwa>Gateway`, nigdy do własnego `/api/*`.

Poza tymi plikami **Blocker** w kodzie produkcyjnym (`packages/*/src/**`,
`packages/app/app/**`, `scripts/setup*`):

- `fetch(`, `window.fetch`, `globalThis.fetch`, `self.fetch`, przypisanie
  `fetch` do zmiennej;
- inny klient HTTP jako obejście: `axios`, `ky`, `got`, `node-fetch`, `undici`,
  `XMLHttpRequest`, `new EventSource('/api/…')`;
- `eslint-disable` dla `no-restricted-globals`/`no-restricted-properties` albo
  zmiana `eslint.config.mjs`, która zawęża te reguły lub dodaje `ignores`.

Nie są naruszeniem: testy integracyjne (`tests/integration/**` — z założenia
wołają API przez `fetch`), podmiana `fetch` w testach jednostkowych
(`vi.stubGlobal("fetch", …)`, `vi.spyOn(globalThis, "fetch")`) oraz słowo
`fetch` w nazwach (`refetch`, `prefetch`, `fetchMentors` w `apiCall`).

```bash
added_lines |
  grep -vE '^(packages/ui/src/backend/api/api-call\.ts|packages/core/src/services/[^/]+/adapters/|tests/integration/|packages/[^/]+/test/|scripts/test/)' |
  grep -E "(^|[^A-Za-z0-9_.])fetch\s*\(|(window|globalThis|self)\.fetch|=\s*fetch\b|from ['\"](axios|ky|got|node-fetch|undici)['\"]|XMLHttpRequest|new EventSource|eslint-disable.*no-restricted-(globals|properties)"
```

Każde trafienie zweryfikuj, czytając linię w kontekście (komentarz, napis w
teście, metoda obiektu, np. `client.fetch`), zanim je zgłosisz.

Przykład wpisu w **⛔ Blocker**:

```markdown
- `packages/app/app/(student)/bookings/page.tsx:27` — surowy
  `fetch("/api/bookings")` pomija nagłówek CSRF i parsowanie koperty →
  narusza engineering-standards.md („Fetch through `apiCall`/`apiCallOrThrow`”)
  → zamień na `apiCall<Booking[]>("/api/bookings")` z
  `@devmentor/ui/backend/api/api-call`.
```

## Dodatki do wyniku review

Uzupełniają `references/output-format.md` zainstalowanego skilla; reszta formatu
bez zmian.

1. Każde naruszenie z obu kontroli trafia do **⛔ Blocker** z dokładnym
   `plik:linia` (linia w pliku po zmianie), regułą źródłową i konkretną poprawką.
   Jedno naruszenie = jeden wpis; nie grupuj kilku plików w jednym punkcie.
2. Bezpośrednio po sekcji **🧪 Validation Gate** dodaj zawsze tę tabelę — także
   gdy obie kontrole przechodzą, bo jest dowodem, że je wykonano:

   ```markdown
   ## 🧱 Granice pakietów i warstwa HTTP

   | Kontrola | Status | Dowód |
   |----------|--------|-------|
   | Kierunek zależności `app → core → db`, `app → ui` | PASS / FAIL / NOT RUN | {liczba sprawdzonych importów albo lista `plik:linia`} |
   | Brak surowego `fetch` poza `api-call.ts` i `adapters/` | PASS / FAIL / NOT RUN | {liczba trafień po weryfikacji albo lista `plik:linia`} |
   ```

3. FAIL lub NOT RUN w którejkolwiek kontroli wymusza werdykt
   **❌ request changes** — zgodnie z mechanicznym werdyktem zainstalowanego
   skilla (każdy blocker = request changes).
