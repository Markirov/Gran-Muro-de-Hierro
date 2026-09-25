#!/usr/bin/env bash
# verify.sh — gate de verificación antes de cerrar tarea (AGENTS.md §1.1, regla D.1).
# STUB: rellena con los comandos del stack. Debe salir != 0 si algo falla.
set -euo pipefail
cd "$(dirname "$0")"

echo "== verify.sh =="
echo "Sin stack definido. Añade aquí, en orden y con salida no-cero si fallan:"
echo "  1. Tipos   2. Lint   3. Tests   4. Build"
# Ejemplo Node: npx tsc --noEmit && npm run lint && npm test && npm run build
exit 0
