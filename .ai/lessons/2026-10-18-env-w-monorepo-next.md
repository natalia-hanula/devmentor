# Zmienne środowiskowe Next.js w monorepo

## Objawy

Po przeniesieniu aplikacji do `packages/app` strona `/admin` pokazywała „Brak połączenia”, a w logu serwera pojawiał się błąd `Brak zmiennej środowiskowej DATABASE_URL`, mimo że `.env` leżał w katalogu głównym repo.

## Przyczyna

Next.js wczytuje `.env*` wyłącznie z katalogu projektu Next (`packages/app`) i nie ma opcji wskazania innego katalogu. Dwa podejścia, które **nie działają**:

- `loadEnvConfig(rootDir)` z `@next/env` w `next.config.ts` — `@next/env` robi migawkę `process.env` przy pierwszym imporcie i przy (prze)ładowaniu env przywraca `process.env` do tej migawki. Zmienne dodane w trakcie ładowania configu nie docierają do renderowania.
- `NODE_OPTIONS=--env-file-if-exists=../../.env` — Node odrzuca tę flagę w `NODE_OPTIONS`.

## Rozwiązanie

Jeden `.env` w katalogu głównym (czyta go też CLI MikroORM i Vitest), a `packages/app/.env` to symlink:

```bash
ln -s ../../.env packages/app/.env
```

Next obsługuje go natywnie, łącznie z przeładowaniem env w `next dev`. Plik jest ignorowany przez git (`.env*`).

## Jak zapobiegać

- Nie twórz osobnych `.env` w pakietach. Nową zmienną dopisz do głównego `.env` i `.env.example`.
- Przy błędach w Server Components nie połykaj wyjątków bez logowania (`console.error` po stronie serwera) — bez tego przyczynę widać dopiero po dodaniu logów.
