#!/usr/bin/env bash
# verify.sh — gate de verificación antes de cerrar tarea (AGENTS.md §1.1, regla D.1).
# 1. Sintaxis del <script> inline de index.html.  2. Suite completa tests/test_*.js.
# Sale != 0 si algo falla. Uso: bash verify.sh
set -uo pipefail
cd "$(dirname "$0")"

echo "== verify.sh =="

echo "-- 1/2 sintaxis --"
node scripts/check-syntax.js || exit 1

echo "-- 2/2 suite tests/ --"
[ -d node_modules/jsdom ] || { echo "Falta jsdom: ejecuta 'npm install'."; exit 1; }
cd tests
total=0; suites=0; failed=0; failed_names=""
for t in test_*.js; do
  suites=$((suites+1))
  out=$(timeout 60 node "$t" 2>&1); code=$?
  count=$(printf '%s\n' "$out" | grep -c "✓ ")
  total=$((total + count))
  if [ $code -ne 0 ]; then
    failed=$((failed+1)); failed_names="$failed_names $t"
    echo "✗ $t (exit $code)"; printf '%s\n' "$out" | grep -v "✓ " | tail -15
  fi
done
echo "$suites suites · $total verifications · $failed failures"
[ $failed -eq 0 ] || { echo "Failed:$failed_names"; exit 1; }
