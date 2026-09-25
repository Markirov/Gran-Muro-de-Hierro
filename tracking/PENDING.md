# BACKLOG DE TAREAS (PENDING)

> Arriba solo lo pendiente, por prioridad. Al cerrar una tarea, su entrada se traslada íntegra a `## ✅ Completado` al final (no se deja `[x]` mezclado entre los `[ ]`).

## 🔴 Alta Prioridad

_(vacío)_

## 🟡 Media Prioridad

- [ ] **Validación física en mesa** (Domain & Product Owner / Marcos, no codeable): imprimir tarjetas y battletrackers de Cazadores del Muro y Herejes Infernales y jugar 2-3 partidas. Confirmar legibilidad, tamaño y encaje de imprenta antes de construir más encima. Hallazgos → aquí como tareas del Lead Developer.
- [ ] **Repo dentro de Google Drive** (decisión de Marcos): Drive siembra `desktop.ini` en `.git/` (262 encontrados el 2026-09-25) y rompe refs. Opciones: mover el clon fuera de `E:\Drive` (recomendado; GitHub ya es el backup) o excluir `.git` de la sincronización. Mientras tanto, si git da `bad ref refs/desktop.ini`: `find .git/refs .git/logs/refs -name desktop.ini -delete`.
- [ ] **`Bandas/cazadores-del-muro.pdf` sin trackear** (decisión de Marcos): commitear como fixture o añadir a `.gitignore` (los demás PDFs generados están ignorados).

## 🟢 Baja Prioridad

- [ ] **Conteo de verificaciones no determinista:** tres corridas seguidas de `verify.sh` dieron 2611 / 2613 / 2622 ✓ con 0 fallos. Alguna suite (probablemente simulación Lab con RNG) emite un número variable de líneas `✓`. No rompe nada, pero ensucia la métrica: localizar la suite y fijar semilla o normalizar el número de asserts.
- [ ] **House rules para partida libre:** hoy solo existen overrides de Trauma D66 por campaña (`campaign.houseRules`, modal "⚙ House Rules"). Extender a partidas libres (a nivel de banda) y valorar más ámbitos. Requiere definición de producto antes de codificar.

---

## ✅ Completado

- [x] **Migrar backlog previo a tracking:** volcar `BACKLOG.md`, `TODO.md` y `ROADMAP.md` (raíz) a este archivo por prioridad, y retirarlos o dejarlos como histórico.
- [x] **Definir `verify.sh` real:** hoy es un stub (`package.json` no tiene test real; hay `tests/` y `jsdom`). Cablear la suite de `tests/` y añadir las directrices `D.*` del Lead Developer.
