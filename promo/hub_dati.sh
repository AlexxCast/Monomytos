#!/usr/bin/env bash
# Gestisce il ramo "hub-dati", dove vivono i dati del Centro social (hub/index.html).
# Uso: bash promo/hub_dati.sh prepara        → ../hub-dati con il ramo (lo crea se non c'è)
#      bash promo/hub_dati.sh salva "messaggio" → commit e push, riprova se un altro workflow ha scritto nel frattempo
set -e
D=../hub-dati
git config --global user.name "github-actions[bot]"
git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
case "$1" in
  prepara)
    if git fetch -q --depth 1 origin hub-dati 2>/dev/null; then git worktree add -q -B hub-dati "$D" origin/hub-dati
    else git worktree add -q --orphan -b hub-dati "$D"; fi ;;
  salva)
    cd "$D"
    git add -A
    git diff --cached --quiet && { echo "niente da salvare"; exit 0; }
    git commit -qm "$2"
    for i in 1 2 3 4; do
      git push -q origin hub-dati && exit 0
      sleep $((i * 3)); git pull -q --rebase origin hub-dati || true
    done
    echo "push non riuscito"; exit 1 ;;
esac
