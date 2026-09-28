#!/usr/bin/env bash
# Despliegue manual a Firebase Hosting (+ reglas de Firestore).
# Construye el proyecto de Next.js y publica el directorio "out".
set -euo pipefail
cd "$(dirname "$0")/.."

# Correr tests primero


echo "Construyendo Next.js..."
npm run build

echo "Desplegando a Firebase..."
firebase deploy --only hosting,firestore:rules
