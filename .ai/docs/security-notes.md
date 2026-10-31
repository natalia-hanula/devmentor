# Notatki o bezpieczeństwie pracy z agentem

Stan na 2026-10-31 (lekcje 09 i 10). Dokument żywy — aktualizuj w miejscu. Dotyczy narzędzi agenta (Claude Code),
nie bezpieczeństwa aplikacji (to opisuje `AGENTS.md` → „Bezpieczeństwo — minimum”).

## Uprawnienia i sandbox (`.claude/settings.json`)

- **`permissions.deny` na Read:** `./.env`, `./.env.local`, `./.env.*.local`, `./.env.development`, `./.env.production`,
  `./.env.test`, `**/*.pem`, `~/.ssh/**`, `~/.aws/**`. Warianty `.env.*` wymieniamy jawnie zamiast wzorca `.env.*`,
  bo reguły `deny` mają pierwszeństwo i wzorzec zablokowałby też `.env.example` (czytamy go celowo).
- **Sandbox:** `enabled: true`, `allowUnsandboxedCommands: false` (flaga `dangerouslyDisableSandbox` nie działa),
  `filesystem.denyRead` na te same lokalizacje, `filesystem.allowRead` tylko `./.env.example`.
- **`network.allowedDomains`:** `registry.npmjs.org`, `github.com`, `api.github.com`, `codeload.github.com`,
  `objects.githubusercontent.com`, `localhost`, `127.0.0.1`. Fontów Google nie dopuszczamy — projekt nie używa
  `next/font/google`. Rejestry Dockera pomijamy: obrazy pobiera Docker Desktop, nie agent.
- **Skutki uboczne sandboxa:** zapis Bashem w `.claude/skills`, `.claude/hooks` i `.claude/settings.json` jest
  zablokowany (zmiany robimy przez Edit/Write). Pięć testów jednostkowych zależnych od odrzucenia połączenia na
  `127.0.0.1:1` (`isDatabaseUnavailableError`, `apiHandler`, `redirectHandler`) pada w sandboxie również na kodzie
  sprzed tych zmian — to efekt środowiska, nie regresja. Poza sandboxem nie uruchamiano ich w tej sesji.

## Hook `PreToolUse` na Bash (`.claude/hooks/block-dangerous.sh`)

Blokuje kodem 2: `rm -rf` (także `-fr`, `-r -f`, `--recursive --force`), `git push --force` (także `-f`
i `--force-with-lease`), `git reset --hard`, `curl`/`wget` z pipe do `sh`/`bash`/`zsh`/`dash`/`ksh`, `chmod 777`.
Brak `jq` albo nieczytelny JSON → odmowa (fail closed).

**Wynik testu bez agenta** (`bash .claude/hooks/block-dangerous.sh`, JSON na stdin):

| Przypadek | Wynik |
| --- | --- |
| `{"tool_input":{"command":"rm -rf /"}}` | kod 2, „Zablokowano: rm -rf” |
| 14 wariantów niebezpiecznych (rm w 4 zapisach, 3 × `git push`, `git reset --hard`, `curl`/`wget` z pipe, 2 × `chmod 777`) | 14 × kod 2 |
| 9 poleceń bezpiecznych (`rm plik`, `rm -r katalog`, `git push origin gałąź`, `git reset --soft`, `curl -o`, `chmod 755`, `ls` …) | 9 × kod 0 |
| nieczytelny JSON | kod 2 |

Potwierdzenie w działaniu: hook zablokował polecenie z `rm -rf` wywołane przez agenta w tej sesji.

**Ograniczenia:** to filtr po wzorcach tekstu, nie granica bezpieczeństwa — obejdzie go m.in. `find -delete`,
`bash -c "$(…)"`, kodowanie polecenia. Granicą jest sandbox; hook łapie pomyłki, nie atak.

## Skille

- Zainstalowane: 44 skille OM (`.agents/skills/`, kopie w `.claude/skills/`, `grilling` jako symlink) oraz override
  `.ai/skills/om-code-review`.
- **Skan** (wstrzykiwanie komend `!` + backtick, `curl`, `wget`, `base64`, `.env`, `~/.ssh`, `~/.aws`): bez znalezisk
  niepokojących. Wstrzykiwanie komend — fałszywy alarm (`$!` w tabeli składni powłoki); `curl`/`wget` — pobranie binarki agent-browser z releasów
  GitHuba z weryfikacją SHA256 per platforma; `base64` — wysyłka screenshotów do trackera przez plik tymczasowy;
  `.env` — wyłącznie reguły „nigdy nie wklejaj treści `.env`”; `~/.ssh` i `~/.aws` — 0 trafień. Frontmatter bez
  `allowed-tools` i `hooks`.
- **Ryzyko do pamiętania:** `--skill-url` w `om-auto-create-pr` pobiera treść zewnętrzną z URL-a podanego w wywołaniu
  (skill zabrania wykonywania z niej instrukcji naruszających reguły projektu). Nie podawaj URL-i z nieznanych źródeł.
- **Auto-discovery:** 25 nieużywanych skilli wyłączono flagą `disable-model-invocation: true` w obu katalogach
  (nadal wywołasz je ręcznie `/nazwa`). Reinstalacja skilli OM nadpisze flagi — zob. wpis w `.ai/lessons.md`.

## MCP

- Projekt nie deklaruje serwerów MCP (brak `.mcp.json`).
- Sesje agenta mają dodatkowo konektory kontowe claude.ai (np. Slack, Notion, Google Drive, Atlassian). Działają poza
  sandboxem sieci projektu i mogą wysyłać dane na zewnątrz (wiadomość, udostępnienie pliku). Do pracy nad DevMentor
  nie są potrzebne — włączaj je tylko na czas konkretnego zadania.

## Skan sesji pod kątem sekretów

Wynik skanu plików sesji: **10 znalezisk — 2 × `jwt` i 8 × `generic-api-key`** w plikach sesji. Reakcja:
`AUTH_JWT_SECRET` **zrotowany 31.10.2026**. Wartości celowo nie są zapisane w żadnym pliku repozytorium ani w tym
dokumencie. Wniosek: pliki sesji mogą zawierać wszystko, co agent zobaczył; dlatego sekrety są zablokowane dla Read
(deny + `denyRead`), a po każdym podejrzeniu wycieku rotujemy sekret.

## Trifekta (dane prywatne + niezaufana treść + komunikacja na zewnątrz)

Odcinamy nogę **komunikacji na zewnątrz** — w sandboxie (`network.allowedDomains` + `allowUnsandboxedCommands: false`
w `.claude/settings.json`), z drugą warstwą po stronie danych prywatnych (`deny`/`denyRead` na sekrety); hook
`block-dangerous.sh` tylko wspiera. Luki: `github.com` na liście pozwala technicznie wysłać dane do cudzego repozytorium
lub gista, a konektory MCP z konta omijają filtr sieci sandboxa.
