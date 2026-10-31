# om-prepare-test-env — notatki repo-lokalne (devmentor)

Wejście: `sh .ai/scripts/test-env-up.sh` (flagi `--force`, `--force-rebuild`), zatrzymanie: `sh .ai/scripts/test-env-down.sh`.
Deskryptor: `.ai/qa/test-env.json`, hasła kont demo: `.ai/qa/test-env.env` (poza gitem).

## Co robi skrypt

Docker jest zainstalowany, a PostgreSQL na 5432 to kontener z `npm run db:up` (`docker-compose.yml`). Skrypt nie startuje własnego kontenera —
używa tego serwera i tworzy na nim dedykowaną bazę `devmentor_qa` (rola z `.env.example`, nadpisanie `TEST_ENV_PG_BASE_URL`),
schemat czyszczony przy każdym świeżym starcie → `npm run build` (cache) → migracje → seed (`APP_ENV=test`) → `next start` na porcie 3100 (lub wolnym).
Nigdy nie dotyka bazy `devmentor` ani `devmentor_integration`.

## Wnioski

- W sandboxie `docker info` zawodzi, bo sandbox blokuje dostęp do gniazda Dockera — to nie znaczy, że Dockera brak. Nie wnioskuj „bez Dockera” z tego błędu;
  stan kontenera sprawdzaj z zwykłego terminala (`docker compose ps`) albo sondą `pg_isready -h localhost`.
- Seed uruchamiaj `node --import tsx scripts/seed.ts`, nie `npx tsx` — CLI tsx otwiera gniazdo unix w katalogu tymczasowym i w sandboxie kończy się `EPERM`.
- Migracje zapisują `packages/db/migrations/.snapshot-devmentor_qa.json` — plik jest w `.gitignore`; nie commituj.
- W sandboxie powłoka nie może sygnalizować ani sprawdzać procesów z wcześniejszych poleceń (`kill -0` → EPERM, `ps` zablokowany): skrypt wtedy ufa sondom HTTP,
  a `test-env-down.sh` odmawia oznaczenia środowiska jako zatrzymanego. Zatrzymanie aplikacji: z zwykłego terminala `sh .ai/scripts/test-env-down.sh`.
- Hook projektu blokuje polecenia zawierające `rm -rf` i `cat .env*` — skryptów nie edytuj heredocami z tym tekstem, używaj narzędzia Edit.
- agent-browser: repo ma `agent-browser` 0.39.1 (`node_modules/.bin/agent-browser`); Chrome for Testing jest zainstalowany. Pełne `doctor` w sandboxie zawodzi
  (CDN + katalog `~/.agent-browser`), więc żywy start przeglądarki trzeba sprawdzić poza sandboxem.
- Limiter logowania: `TRUST_PROXY=false` → wszyscy klienci pod jednym kluczem; przy serii logowań w QA użyj osobnych kont albo zrestartuj środowisko.
