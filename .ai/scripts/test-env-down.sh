#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2) -- teardown
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-10-31 generated
#   2026-10-31 repair: refuse to mark stopped when the app pid cannot be signaled (sandboxed shell)
set -eu

QA_DIR=".ai/qa"
ENV_DESCRIPTOR="$QA_DIR/test-env.json"
LOCK_DIR="$QA_DIR/test-env.lock"
DB_NAME="devmentor_qa"
PG_BASE_URL="${TEST_ENV_PG_BASE_URL:-postgresql://devmentor:devmentor@localhost:5432}"

cd "$(dirname "$0")/../.."

json_num() { sed -n "s/.*\"$1\": *\([0-9][0-9]*\).*/\1/p" "$2" | head -1; }

if [ -f "$ENV_DESCRIPTOR" ] && grep -q '"startedByThisRepo": *true' "$ENV_DESCRIPTOR"; then
  APP_PID=$(json_num pid "$ENV_DESCRIPTOR")
  # Only stop the PID we recorded, and only if it is still a next server.
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    if ps -p "$APP_PID" -o command= | grep -q 'next'; then
      kill "$APP_PID" 2>/dev/null || true
      n=0
      while kill -0 "$APP_PID" 2>/dev/null && [ "$n" -lt 20 ]; do sleep 0.5; n=$((n + 1)); done
      kill -0 "$APP_PID" 2>/dev/null && kill -9 "$APP_PID" 2>/dev/null || true
    fi
  elif [ -n "$APP_PID" ] && ! ps -p $$ >/dev/null 2>&1; then
    # Sandboxed shell: processes of earlier commands cannot be signaled or inspected. Say so, change nothing.
    printf 'TEST_ENV_STATUS=running\nTEST_ENV_NOTE=cannot signal pid %s from this shell; stop it from an unsandboxed terminal\n' "$APP_PID"
    exit 1
  fi
  # Drop only the database the up script created.
  if psql "$PG_BASE_URL/postgres" -Atqc 'select 1' >/dev/null 2>&1; then
    psql "$PG_BASE_URL/postgres" -qc "drop database if exists $DB_NAME with (force)" || true
  fi
  sed 's/"status": *"running"/"status": "stopped"/' "$ENV_DESCRIPTOR" > "$ENV_DESCRIPTOR.tmp" && mv "$ENV_DESCRIPTOR.tmp" "$ENV_DESCRIPTOR"
fi
rm -rf "$LOCK_DIR"
printf 'TEST_ENV_STATUS=stopped\n'
