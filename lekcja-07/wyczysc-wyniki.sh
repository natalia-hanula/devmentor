#!/usr/bin/env bash
# Przenosi wyniki ćwiczeń lekcji 07 poza repozytorium, żeby zrobić ćwiczenia od nowa.
# Niczego nie kasuje. Uruchom w katalogu głównym projektu:
#   bash lekcja-07/wyczysc-wyniki.sh
set -euo pipefail

cel="$HOME/lekcja-07-wyniki-$(date +%Y%m%d-%H%M%S)"
sciezki=(
  lekcja-07/mapa-ekranow.md
  prototypes/konta-i-role
  packages/ui/.storybook/public/prototypes
  .ai/specs/research/personas.md
  .ai/specs/research/calibration.md
)

przeniesione=0
for s in "${sciezki[@]}" .ai/prototypes/discovery/mentor-onboarding* .ai/specs/research/walkthroughs/*mentor-onboarding*; do
  [ -e "$s" ] || continue
  mkdir -p "$cel/$(dirname "$s")"
  mv "$s" "$cel/$s"
  echo "przeniesiono: $s"
  przeniesione=$((przeniesione + 1))
done

if [ "$przeniesione" -eq 0 ]; then
  echo "Nie ma wyników do przeniesienia."
else
  echo "Wyniki są teraz w: $cel"
fi
git status --short
