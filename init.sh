#!/usr/bin/env bash
# init.sh — bootstrap de arranque de sesión (AGENTS.md §0). Stack-agnóstico.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Harness multi-agente =="

# 1. Git
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "-- git status --"; git status --short --branch
else
  echo "AVISO: no es un repo git. Ejecuta 'git init' para activar locks y micro-commits."
fi

# 2. Hook de verificación
if [ -f scripts/git-hooks/pre-commit ] && [ -d .git ]; then
  cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit 2>/dev/null || true
  echo "-- hook pre-commit instalado --"
fi

# 3. Dependencias (rellenar según el stack)
#   Node:   [ -f package.json ] && npm install
[ -d node_modules/jsdom ] || { echo "-- npm install (jsdom) --"; npm install --silent; }
#   Python: [ -f requirements.txt ] && pip install -r requirements.txt

# 4. Versión del harness (aviso pasivo si el framework tiene una más nueva; NUNCA se aplica sola)
if [ -f .agents/HARNESS_VERSION ]; then
  LOCAL_HARNESS_VERSION="$(cat .agents/HARNESS_VERSION)"
  echo "-- harness v$LOCAL_HARNESS_VERSION --"
  if [ -f .agents/HARNESS_SOURCE ]; then
    HARNESS_SRC="$(cat .agents/HARNESS_SOURCE)"
    if [ -f "$HARNESS_SRC/VERSION" ]; then
      CANON_HARNESS_VERSION="$(cat "$HARNESS_SRC/VERSION")"
      if [ "$CANON_HARNESS_VERSION" != "$LOCAL_HARNESS_VERSION" ]; then
        echo "   ⚠ hay núcleo más nuevo disponible: v$CANON_HARNESS_VERSION (aquí: v$LOCAL_HARNESS_VERSION)"
        echo "   Corre 'bash \"$HARNESS_SRC/harness.sh\" update' para sincronizar (no se aplica solo)."
      fi
    fi
  fi
fi

# 5. Backlog (dir configurable vía .agents/HARNESS_TRACKING_DIR — proyectos retro-adoptados
#    con convención propia, p.ej. 'herramientas/md', no migran solo por correr init.sh)
TRACKING_DIR="tracking"
[ -f .agents/HARNESS_TRACKING_DIR ] && TRACKING_DIR="$(cat .agents/HARNESS_TRACKING_DIR)"
echo ""; echo "== Backlog prioritario ($TRACKING_DIR/PENDING.md) =="
[ -f "$TRACKING_DIR/PENDING.md" ] && sed -n '/## 🔴/,/## ✅ Completado/p' "$TRACKING_DIR/PENDING.md" | head -30
echo ""; echo "Lee .agents/AGENTS.md entero antes de operar."
