# Lessons

Indeks ustaleń, wniosków i usprawnień zebranych podczas pracy nad projektem.
Przeczytaj ten plik przed rozpoczęciem pracy. Zasady dopisywania wpisów: zob. `AGENTS.md` → „Lessons”.

Format wpisu (najnowsze na górze):

```
- YYYY-MM-DD — <jedno zdanie: czego się nauczyliśmy / co robić inaczej> [→ lessons/YYYY-MM-DD-slug.md]
```

## Wpisy

- 2026-10-18 — Znane ograniczenie: wariantu Docker instalatora `npm run setup` nikt nie sprawdził ręcznie, bo w środowisku właścicielki nie ma Dockera. Lokalnie przetestowany jest tylko wariant Homebrew, a testcontainers działa wyłącznie w CI (tworzenie baz, nie cały instalator). Przy zmianach instalatora wariant Docker zgłaszaj w PR-ze jako niesprawdzony, chyba że ktoś z Dockerem przejdzie go ręcznie.
- 2026-10-18 — Type stripping w Node (`node --experimental-strip-types`, `scripts/`) usuwa tylko importy oznaczone `import type`: bez `verbatimModuleSyntax: true` (bazowy tsconfig ma `false`) import samego typu przechodzi typecheck, a w Node kończy się błędem „does not provide an export named”. Do tego importy z rozszerzeniem `.ts` (`allowImportingTsExtensions`) i `erasableSyntaxOnly` — zob. `scripts/tsconfig.json`.
- 2026-10-18 — Branch protection / rulesety na `main` są celowo wyłączone: repo jest prywatne na darmowym planie GitHuba (API zwraca 403 „Upgrade to GitHub Pro”), a decyzją właścicielki nie upgradujemy ani nie upubliczniamy repo. Nie próbuj ich włączać — obowiązuje zasada „nie merguj PR-a z czerwonym CI” (`AGENTS.md` → „Testy i CI”).
- 2026-10-18 — Vitest 5: uruchomienie z `--project <nazwa>` nie zbiera pokrycia (raport „Unknown”) — pokrycie zawsze sprawdzaj pełnym `npm test`.
- 2026-10-18 — Kod nie do pokrycia testem (np. wywołanie funkcji z tego samego modułu, martwa gałąź `?? ""`) to sygnał do zmiany kodu: wydziel moduł / wstrzyknij zależność / usuń gałąź — nie dopisuj wyłączeń z pokrycia.
- 2026-10-18 — `agent-browser` ma natywne binarki w paczce npm, a wrapper sam robi `chmod` — `postinstall` (blokowany przez npm 11) nie jest potrzebny. Lokalnie używa zainstalowanego Chrome'a; w CI na ubuntu-24.04 potrzebne `AGENT_BROWSER_ARGS=--no-sandbox`.
- 2026-10-18 — Testy integracyjne lokalnie bez Dockera: `INTEGRATION_DATABASE_URL` na osobną bazę (`devmentor_integration`) — setup czyści jej schemat, więc nigdy nie wskazuj bazy z danymi.
- 2026-10-18 — MikroORM 7 łączy się z bazą leniwie: `MikroORM.init()` przechodzi przy wyłączonej bazie, a błąd pojawia się przy pierwszym zapytaniu jako `DriverException` z kodem `ECONNREFUSED` (nie `ConnectionException`) — do klasyfikacji używaj `isDatabaseUnavailableError` z `@devmentor/db`.
- 2026-10-18 — MikroORM 7: `Migration.addSql()` przyjmuje tylko SQL, bez parametrów — dane referencyjne w migracjach wpisuj jako stałe literały, nigdy wartości z zewnątrz.
- 2026-10-18 — Po przeniesieniu lub zmianie nazw tras `npm run typecheck` w `app` może padać na nieaktualnych `.next/dev/types` (z `next dev`), których `next typegen` nie odświeża — usuń `packages/app/.next`.
- 2026-10-18 — Z `cacheComponents` trasy API (`route.ts`) z dostępem do bazy są dynamiczne bez żadnej konfiguracji, a `export const dynamic` kończy się błędem — nie dodawaj go, nawet jeśli standard lub stary kod tak sugeruje.
- 2026-10-18 — W zsh niecytowana zmienna (`curl $H …`) nie jest dzielona na słowa — w testach curl podawaj nagłówki jako osobne, cytowane argumenty, inaczej dostaniesz 400 od parsera HTTP zamiast odpowiedzi aplikacji.
- 2026-10-18 — Next.js czyta `.env` tylko z katalogu aplikacji; w monorepo `packages/app/.env` to symlink do głównego `.env` — `loadEnvConfig()` w `next.config.ts` NIE działa (zmienne giną przy renderowaniu). [→ lessons/2026-10-18-env-w-monorepo-next.md]
- 2026-10-18 — MikroORM 7 zastąpił `@mikro-orm/knex` pakietem `@mikro-orm/sql`; domyślna lista `serverExternalPackages` w Next 16.4 tego nie uwzględnia, więc `@mikro-orm/postgresql`, `sql` i `migrations` dopisujemy ręcznie. Nigdy nie dodawaj ich do `transpilePackages` (Next rzuci błąd). Turbopack sam transpiluje pakiety workspace.
- 2026-10-18 — shadcn CLI 4.x importuje `cn` z paczki npm `cn` (shadcn-ui/cn) i sam ją instaluje — to oficjalna zmiana, nie błąd; nie przywracaj `clsx`/`tailwind-merge`.
- 2026-10-18 — Decyzja człowieka: alerty `npm audit` o `braces` (przez `fast-glob` w `eslint-config-next` i `awilix`) akceptujemy — NIE cofaj Awilix do 6.x ani nie rób `npm audit fix --force`.
- 2026-10-18 — `next dev` sam pisze `AGENTS.md` w katalogu aplikacji; w `next.config.ts` mamy `agentRules: false` i bez `experimental.agentFeedback` (decyzja człowieka) — reguły dla agentów są tylko w głównym `AGENTS.md`, nie włączaj tych opcji z powrotem.
- 2026-10-18 — Zatrzymując serwer Next, zabijaj proces po porcie (`lsof -ti :3000 | xargs kill`), nie `pkill -f "next start"` (proces to `next-server`) — inaczej testujesz starą instancję.
