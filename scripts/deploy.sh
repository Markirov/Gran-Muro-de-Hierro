#!/usr/bin/env bash
# Despliegue manual a Firebase Hosting (+ reglas de Firestore).
# Publica solo la app: index.html y las imágenes de placeholder si existen.
set -euo pipefail
cd "$(dirname "$0")/.."

bash verify.sh

rm -rf dist
mkdir -p dist
cp index.html dist/
if [ -d assets/wwi-placeholders ]; then
  mkdir -p dist/assets
  cp -r assets/wwi-placeholders dist/assets/
fi

firebase deploy --only hosting,firestore:rules
