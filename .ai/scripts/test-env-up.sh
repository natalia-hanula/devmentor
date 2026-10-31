#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2)
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-10-31 generated (dedicated database on the PostgreSQL container from `npm run db:up`)
#   2026-10-31 repair: seed via `node --import tsx` (tsx CLI needs a unix IPC socket; fails in sandboxed shells with EPERM)
#   2026-10-31 repair: PID liveness defers to the HTTP probes when processes cannot be inspected (sandbox EPERM); app gets </dev/null so callers piping the script do not hang
#   2026-10-31 repair: abort when teardown of a stale env fails; only the lock owner releases the lock (a failed run deleted the running app's lock)
#   2026-10-31 repair: launch next via APP_BIN + "start" (the combined command string was executed as one path)
set -eu

# --- project-specific variables (tweak here, not in the logic below) ---
QA_DIR=".ai/qa"
ENV_DESCRIPTOR="$QA_DIR/test-env.json"
BUILD_CACHE="$QA_DIR/test-env-build-cache.json"
CREDENTIALS_FILE="$QA_DIR/test-env.env"
APP_LOG="$QA_DIR/test-env-app.log"
LOCK_DIR="$QA_DIR/test-env.lock"
UP_SCRIPT=".ai/scripts/test-env-up.sh"
DOWN_SCRIPT=".ai/scripts/test-env-down.sh"

PREFERRED_PORT=3100
HEALTH_PATH="/api/health"
APP_BIN="node_modules/.bin/next"                       # run in packages/app as: next start
APP_DIR="packages/app"
APP_START_TIMEOUT=60

# Dedicated, disposable database on the local PostgreSQL (schema is dropped on every fresh boot).
# Role/host come from the documented defaults in .env.example; override with TEST_ENV_PG_BASE_URL.
DB_NAME="devmentor_qa"
PG_BASE_URL="${TEST_ENV_PG_BASE_URL:-postgresql://devmentor:devmentor@localhost:5432}"
MIGRATE_CMD="npm run migration:up -w @devmentor/db"
SEED_CMD="node --import tsx scripts/seed.ts"      # not the tsx CLI: its IPC socket is blocked in sandboxed runs

# Demo-grade values only (APP_ENV=test: seed allowed, mail outbox, no real mail).
QA_APP_ENV="test"
QA_JWT_SECRET="qa-test-env-demo-secret-not-for-production-0123456789"
SEED_PASSWORD="test-haslo-nie-sekret"                   # scripts/seed/test-accounts.ts (documented, not a secret)

# Build cache
BUILD_INPUTS="packages scripts package.json package-lock.json tsconfig.json"
BUILD_ENV_VARS="NODE_ENV"
ARTIFACTS="packages/app/.next"
PREP_CHAIN="prepare_workspace"

# Provider state verified at generation time (agent-browser pinned by the repo).
BROWSER_PROVIDER="agent-browser"
BROWSER_COMMAND="node_modules/.bin/agent-browser"
BROWSER_VERSION="0.39.1"
BROWSER_NOTES="Chrome for Testing installed; offline doctor passes. Live launch could not be verified at generation (sandbox blocked the daemon socket dir and CDN)."

TTL="${TEST_ENV_CACHE_TTL_SECONDS:-600}"
FORCE=0
FORCE_REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --force-rebuild) FORCE_REBUILD=1 ;;
  esac
done
[ "${FORCE_REBUILD}" = 1 ] && export FORCE_REBUILD

cd "$(dirname "$0")/../.."
mkdir -p "$QA_DIR"
START_EPOCH=$(date +%s)

now_iso() { date -u +%FT%TZ; }
log() { printf '[test-env] %s\n' "$*" >&2; }
json_str() { sed -n "s/.*\"$1\": *\"\([^\"]*\)\".*/\1/p" "$2" | head -1; }
json_num() { sed -n "s/.*\"$1\": *\([0-9][0-9]*\).*/\1/p" "$2" | head -1; }
# Sandboxed shells may be unable to signal or inspect processes started by an earlier command
# (kill -0 -> EPERM, ps denied). Then the PID cannot be judged and the HTTP probes decide.
can_inspect_pids() { ps -p $$ >/dev/null 2>&1; }
pid_alive() {
  [ -n "${1:-}" ] || return 1
  kill -0 "$1" 2>/dev/null && return 0
  can_inspect_pids || return 0
  return 1
}

free_port() {
  if command -v node >/dev/null 2>&1; then
    node -e 's=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
  else
    awk 'BEGIN{srand();print 20000+int(rand()*20000)}'
  fi
}
port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

probe() { curl -fsS --max-time 5 -o /dev/null "$1" 2>/dev/null; }
probe_health() {
  curl -fsS --max-time 5 "$1$HEALTH_PATH" 2>/dev/null | grep -q '"ok":true'
}

emit_result() {
  printf 'TEST_ENV_STATUS=running\nTEST_ENV_BASE_URL=%s\nTEST_ENV_DESCRIPTOR=%s\nTEST_ENV_REUSED=%s\nBROWSER_PROVIDER=%s\nBROWSER_INSTALLED=1\n' \
    "$1" "$ENV_DESCRIPTOR" "$2" "$BROWSER_PROVIDER"
}

# --- fingerprint / build cache (generic; see references/build-cache.md) ---
fp_file() { stat -f '%z:%m' "$1" 2>/dev/null || stat -c '%s:%Y' "$1" 2>/dev/null; }
source_files() {
  for p in $BUILD_INPUTS; do
    if [ -d "$p" ]; then
      find "$p" -type f \
        ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/*' ! -path '*/dist/*' \
        ! -path '*/.cache/*' ! -path '*/coverage/*' ! -path '*/storybook-static/*' \
        ! -name '*.tsbuildinfo' ! -name 'next-env.d.ts' ! -name '.DS_Store'
    elif [ -f "$p" ]; then echo "$p"; fi
  done
}
fingerprint() {
  {
    source_files | LC_ALL=C sort | while IFS= read -r f; do printf '%s:%s\n' "$f" "$(fp_file "$f")"; done
    for v in $BUILD_ENV_VARS; do eval "printf 'env:%s=%s\n' \"$v\" \"\${$v:-}\""; done
  } | cksum | awk '{print $1"-"$2}'
}
build_needed() {
  [ "${FORCE_REBUILD:-0}" = 1 ] && return 0
  [ -f "$BUILD_CACHE" ] || return 0
  CACHED_FP=$(json_str sourceFingerprint "$BUILD_CACHE")
  CACHED_ROOT=$(json_str projectRoot "$BUILD_CACHE")
  [ "$CACHED_FP" = "$(fingerprint)" ] || return 0
  [ "$CACHED_ROOT" = "$(pwd)" ] || return 0
  for a in $ARTIFACTS; do [ -s "$a" ] || [ -d "$a" ] || return 0; done
  return 1
}
prepare_workspace() {
  # Fresh checkout/worktree: install, then build (the app builds without .env and without a database).
  [ -d node_modules ] || npm ci
  npm run build
}

# --- 1. reuse check (a state file is a claim, not proof) ---
reusable() {
  [ "$FORCE" = 1 ] && return 1
  [ -f "$ENV_DESCRIPTOR" ] || return 1
  grep -q '"status": *"running"' "$ENV_DESCRIPTOR" || return 1
  app_pid=$(json_num pid "$ENV_DESCRIPTOR")
  pid_alive "$app_pid" || return 1
  base=$(json_str baseUrl "$ENV_DESCRIPTOR")
  [ -n "$base" ] || return 1
  probe "$base/" || return 1                         # app shell
  probe "$base/login" || return 1                    # rendered page
  probe_health "$base" || return 1                   # API + database round trip
  started=$(json_str startedAt "$ENV_DESCRIPTOR")
  started_epoch=$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$started" +%s 2>/dev/null || date -u -d "$started" +%s 2>/dev/null || echo 0)
  [ $(( $(date +%s) - started_epoch )) -le "$TTL" ] || return 1
  [ -z "$(source_files | while IFS= read -r f; do [ "$f" -nt "$ENV_DESCRIPTOR" ] && echo "$f" && break; done)" ] || return 1
  return 0
}

if reusable; then
  base=$(json_str baseUrl "$ENV_DESCRIPTOR")
  log "reused running environment at $base ($(( $(date +%s) - START_EPOCH ))s)"
  emit_result "$base" 1
  exit 0
fi

# Anything running that this repo started is stale: tear it down before rebuilding.
if [ -f "$ENV_DESCRIPTOR" ] && grep -q '"status": *"running"' "$ENV_DESCRIPTOR"; then
  log "descriptor says running but reuse check failed -> tearing down stale environment"
  sh "$DOWN_SCRIPT" >&2 || { log "teardown failed; not starting a second environment on top of it"; exit 1; }
fi

# --- 2. lock: one bootstrap at a time ---
acquire_lock() {
  waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    owner=$(json_num pid "$LOCK_DIR/owner.json" 2>/dev/null || true)
    if ! pid_alive "$owner"; then rm -rf "$LOCK_DIR"; continue; fi
    [ "$waited" -ge 300 ] && { log "lock held by live pid $owner for 5 min"; exit 1; }
    sleep 2; waited=$((waited + 2))
  done
  LOCK_OWNED=1
  printf '{ "pid": %s, "source": "test-env-up.sh", "acquiredAt": "%s" }\n' "$$" "$(now_iso)" > "$LOCK_DIR/owner.json"
}
KEEP_LOCK=0
LOCK_OWNED=0
release_lock() { [ "$LOCK_OWNED" = 1 ] && [ "$KEEP_LOCK" != 1 ] && rm -rf "$LOCK_DIR"; return 0; }
trap release_lock EXIT
acquire_lock

# A parallel bootstrap may have produced a reusable env while we waited.
if reusable; then
  base=$(json_str baseUrl "$ENV_DESCRIPTOR")
  emit_result "$base" 1
  exit 0
fi

# --- 3. build cache ---
BUILD_STATE=reused
if build_needed; then
  BUILD_STATE=rebuilt
  log "build cache miss -> preparation chain"
  $PREP_CHAIN >&2
  printf '{ "builtAt": "%s", "sourceFingerprint": "%s", "projectRoot": "%s", "artifactPaths": "%s" }\n' \
    "$(now_iso)" "$(fingerprint)" "$(pwd)" "$ARTIFACTS" > "$BUILD_CACHE"
else
  log "build cache hit -> skipping install/build"
fi

# --- 4. database: dedicated, disposable, migrated and seeded fresh per environment ---
case "$DB_NAME" in devmentor_qa) ;; *) log "refusing to reset unexpected database '$DB_NAME'"; exit 1 ;; esac
DATABASE_URL="$PG_BASE_URL/$DB_NAME"
if ! psql "$PG_BASE_URL/postgres" -Atqc 'select 1' >/dev/null 2>&1; then
  log "PostgreSQL not reachable at $PG_BASE_URL (start it, or set TEST_ENV_PG_BASE_URL)"
  exit 1
fi
if [ -z "$(psql "$PG_BASE_URL/postgres" -Atqc "select 1 from pg_database where datname='$DB_NAME'")" ]; then
  psql "$PG_BASE_URL/postgres" -qc "create database $DB_NAME" >&2
fi
psql "$DATABASE_URL" -qc 'drop schema if exists public cascade; create schema public;' >&2
export DATABASE_URL APP_ENV="$QA_APP_ENV" AUTH_JWT_SECRET="$QA_JWT_SECRET"
$MIGRATE_CMD >&2
$SEED_CMD >&2

# --- 5. app start + health wait ---
PORT="$PREFERRED_PORT"
port_free "$PORT" || PORT=$(free_port)
BASE_URL="http://127.0.0.1:$PORT"
export APP_BASE_URL="$BASE_URL" LOG_LEVEL=info
ROOT=$(pwd)
( cd "$APP_DIR" && nohup "$ROOT/$APP_BIN" start --port "$PORT" --hostname 127.0.0.1 </dev/null >"$ROOT/$APP_LOG" 2>&1 & echo $! >"$ROOT/$QA_DIR/test-env-app.pid" )
APP_PID=$(cat "$QA_DIR/test-env-app.pid"); rm -f "$QA_DIR/test-env-app.pid"
waited=0
until probe_health "$BASE_URL"; do
  pid_alive "$APP_PID" || { log "app exited during startup; log: $APP_LOG"; tail -20 "$APP_LOG" >&2; exit 1; }
  [ "$waited" -ge "$APP_START_TIMEOUT" ] && { log "no healthy $HEALTH_PATH after ${APP_START_TIMEOUT}s"; kill "$APP_PID" 2>/dev/null || true; exit 1; }
  sleep 1; waited=$((waited + 1))
done
# The app serves from in-repo build artifacts: hold the lock for its lifetime (the down script releases it).
printf '{ "pid": %s, "source": "app", "acquiredAt": "%s" }\n' "$APP_PID" "$(now_iso)" > "$LOCK_DIR/owner.json"
KEEP_LOCK=1

# --- 6. descriptor + credentials ---
{
  printf 'TEST_OPERATOR_PASSWORD=%s\nTEST_MENTEE_PASSWORD=%s\nTEST_MENTOR_PASSWORD=%s\n' "$SEED_PASSWORD" "$SEED_PASSWORD" "$SEED_PASSWORD"
} > "$CREDENTIALS_FILE"
chmod 600 "$CREDENTIALS_FILE"
for entry in ".ai/qa/test-env.json" ".ai/qa/test-env.env" ".ai/qa/test-env-build-cache.json" ".ai/qa/test-env-app.log" ".ai/qa/test-env.lock/" "packages/db/migrations/.snapshot-$DB_NAME.json"; do
  grep -qxF "$entry" .gitignore 2>/dev/null || printf '%s\n' "$entry" >> .gitignore
done

ELAPSED=$(( $(date +%s) - START_EPOCH ))
RUN_ID="$(date -u +%Y%m%d%H%M%S)-$$"
DB_REDACTED="postgresql://<role>@localhost:5432/$DB_NAME"
cat > "$ENV_DESCRIPTOR" <<EOF
{
  "version": 1,
  "runId": "$RUN_ID",
  "status": "running",
  "mode": "prod",
  "baseUrl": "$BASE_URL",
  "startedByThisRepo": true,
  "startScript": "$UP_SCRIPT",
  "stopScript": "$DOWN_SCRIPT",
  "app": { "startCommand": "next start (packages/app, built)", "port": $PORT, "healthPath": "$HEALTH_PATH", "pid": $APP_PID },
  "services": [
    { "type": "postgres", "host": "localhost", "port": 5432, "container": "", "url": "$DB_REDACTED", "env": { "DATABASE_NAME": "$DB_NAME" } }
  ],
  "credentials": [
    { "role": "operator", "username": "operator.test@example.com", "passwordEnv": "TEST_OPERATOR_PASSWORD" },
    { "role": "mentee", "username": "mentee.test@example.com", "passwordEnv": "TEST_MENTEE_PASSWORD" },
    { "role": "mentor", "username": "mentor.test@example.com", "passwordEnv": "TEST_MENTOR_PASSWORD" }
  ],
  "credentialsFile": "$CREDENTIALS_FILE",
  "browser": {
    "provider": "$BROWSER_PROVIDER",
    "installed": true,
    "command": "$BROWSER_COMMAND",
    "version": "$BROWSER_VERSION",
    "descriptor": ".ai/browsers/agent-browser.md",
    "notes": "$BROWSER_NOTES"
  },
  "testRunner": { "name": "other", "config": "tests/integration/vitest.config.ts" },
  "platform": "$(uname -s | tr 'A-Z' 'a-z')",
  "startedAt": "$(now_iso)",
  "notes": "build: $BUILD_STATE; boot ${ELAPSED}s. Dedicated DB $DB_NAME on the PostgreSQL container from npm run db:up (schema reset each fresh boot, never the dev DB). APP_ENV=$QA_APP_ENV, TRUST_PROXY=false (login limiter counts all clients under one key). Seeded accounts: operator/mentee/mentor.test@example.com plus mentee.niepotwierdzone@example.com (unverified). App log: $APP_LOG. Stop: sh $DOWN_SCRIPT."
}
EOF

log "ready at $BASE_URL (build $BUILD_STATE, ${ELAPSED}s)"
emit_result "$BASE_URL" 0
