#!/usr/bin/env bash
# PreToolUse (Bash): blokuje niebezpieczne polecenia kodem 2.
# Wejście: JSON z hooka na stdin; polecenie w .tool_input.command.
set -u

if ! command -v jq >/dev/null 2>&1; then
  echo "block-dangerous: brak jq — odmowa (fail closed)" >&2
  exit 2
fi

if ! command=$(jq -r '.tool_input.command // empty' 2>/dev/null); then
  echo "block-dangerous: nieczytelny JSON na wejściu — odmowa (fail closed)" >&2
  exit 2
fi

[ -z "$command" ] && exit 0

START='(^|[;&|(`]|&&|\|\||[[:space:]])'
RM_FLAGS_RF='-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*[rR]'

check() {
  local reason=$1 pattern=$2
  if printf '%s' "$command" | grep -Eq -- "$pattern"; then
    echo "Zablokowano: $reason" >&2
    echo "Polecenie: $command" >&2
    exit 2
  fi
}

check "rm -rf" "${START}rm[[:space:]]+(.*[[:space:]])?(${RM_FLAGS_RF})([[:space:]]|\$)"
check "rm z osobnymi flagami -r i -f" "${START}rm[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*f"
check "rm z osobnymi flagami -f i -r" "${START}rm[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*f[a-zA-Z]*[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*[rR]"
check "rm --recursive --force" "${START}rm[[:space:]]+.*--(recursive.*--force|force.*--recursive)"
check "git push --force" "${START}git[[:space:]]+(.*[[:space:]])?push[[:space:]]+(.*[[:space:]])?(--force([[:space:]=]|\$)|--force-with-lease|-[a-zA-Z]*f[a-zA-Z]*([[:space:]]|\$))"
check "git reset --hard" "${START}git[[:space:]]+(.*[[:space:]])?reset[[:space:]]+(.*[[:space:]])?--hard"
check "curl/wget przekazywane do powłoki" "${START}(curl|wget)[[:space:]].*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|da|k)?sh([[:space:]]|\$)"
check "chmod 777" "${START}chmod[[:space:]]+(.*[[:space:]])?(-[a-zA-Z]+[[:space:]]+)*0?777([[:space:]]|\$)"

exit 0
