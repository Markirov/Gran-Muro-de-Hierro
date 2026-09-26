# BACKLOG DE TAREAS (PENDING)

> Arriba solo lo pendiente, por prioridad. Al cerrar una tarea, su entrada se traslada íntegra a `## ✅ Completado` al final (no se deja `[x]` mezclado entre los `[ ]`).

## 🔴 Alta Prioridad


## 🟡 Media Prioridad
- [ ] **Revisar textos de reglas de variante y habilidades de unidades contra los PDF** (Lead Developer, baja): el modo mesa también muestra `VARIANT_FACTION_RULES` y las habilidades de cada unidad; no se han auditado en la revisión de keywords del 2026-09-26. Keywords `CAVALRY` y `ALCHEMIST` de la app no aparecen en los PDF disponibles.

- [ ] **PDFs canon fuera de su sitio** (Marcos): `herramientas/pdfs-reglamento/` está vacío (solo `trench-crusade-tarjetas.pdf`); los PDFs del reglamento están en `E:\_DUPLICADOS_PDF_revisar\` con el prefijo `E__Drive_Trench Crusade_herramientas_pdfs-reglamento_` (parece una limpieza de duplicados). Devolverlos a `herramientas/pdfs-reglamento/` para que la regla D.5 apunte a un sitio real.
- [ ] **Probar el modo mesa en partida real** (Marcos): usarlo en el Android durante 1-2 partidas y anotar aquí lo que falte o sobre. Ideas ya aparcadas en `IDEAS.md`.
- [ ] **Validación física en mesa** (Domain & Product Owner / Marcos, no codeable): imprimir tarjetas y battletrackers de Cazadores del Muro y Herejes Infernales y jugar 2-3 partidas. Confirmar legibilidad, tamaño y encaje de imprenta antes de construir más encima. Hallazgos → aquí como tareas del Lead Developer.

## 🟢 Baja Prioridad

- [ ] **Conteo de verificaciones no determinista:** tres corridas seguidas de `verify.sh` dieron 2611 / 2613 / 2622 ✓ con 0 fallos. Alguna suite (probablemente simulación Lab con RNG) emite un número variable de líneas `✓`. No rompe nada, pero ensucia la métrica: localizar la suite y fijar semilla o normalizar el número de asserts.
- [ ] **House rules para partida libre:** hoy solo existen overrides de Trauma D66 por campaña (`campaign.houseRules`, modal "⚙ House Rules"). Extender a partidas libres (a nivel de banda) y valorar más ámbitos. Requiere definición de producto antes de codificar.

---

## ✅ Completado

- [x] **Huecos de datos canon vistos en el modo mesa** (Domain & Product Owner → verificar en PDF): (1) `Anqa Guard` (Companion, Silahdar de Caza2) no existe en la armería de Forge — ¿es el `Takwin Anqā Bird` u otra pieza? (2) `Jezzail` (Iron Sultanate) tiene `weaponKeywords: []` en la armería; confirmar en el PDF si tiene keywords base. (3) `Greatsword / Greataxe` sale sin keywords con la variante Iron Wall ("Greatsword sin HEAVY"): confirmar que no le queda ninguna. El Lead Developer corrige los datos tras la verificación. → **Cerrado 2026-09-25** con los PDFs canon: (1) es el `Anq Guard` de la armería Iron Wall (alias de nombre); (2) Jezzail sin keywords es correcto; (3) Great Sword/Axe tiene +1 INJURY DICE, CRITICAL, HEAVY — el fallo era de emparejado de nombre. Ver DONE.
- [x] **Modo mesa: toda la información de reglas en la ficha** (petición de Marcos): bloques visibles Armas (keywords explicadas + restricciones), Equipo (keywords + habilidades que concede) y Habilidades (con descripción, sin repetir las del equipo). Sin inventar textos que no estén en los datos.
- [x] **Modo mesa — ficha móvil por miniatura:** diseño en `tracking/plans/PLAN_2026-09-25_modo-mesa.md`, aprobado. Overlay a pantalla completa dentro de Forge, swipe entre miniaturas, estado de combate + activación por turno + efectos/usos, estado en `localStorage` sin tocar la banda.
- [x] **Tarjetas PDF 4 por folio:** opción 2×2 (94,5×132 mm) además de la 3×3 actual; selector en el botón "🃏 Tarjetas PDF" que recuerda la última elección.
- [x] **`Bandas/cazadores-del-muro.pdf` sin trackear** (decisión de Marcos): commitear como fixture o añadir a `.gitignore` (los demás PDFs generados están ignorados). → **Cerrado 2026-09-25:** Marcos elige ignorarlo; añadido a `.gitignore`.
- [x] **Repo dentro de Google Drive** (decisión de Marcos): Drive siembra `desktop.ini` en `.git/` (262 encontrados el 2026-09-25) y rompe refs. Opciones: mover el clon fuera de `E:\Drive` (recomendado; GitHub ya es el backup) o excluir `.git` de la sincronización. Mientras tanto, si git da `bad ref refs/desktop.ini`: `find .git/refs .git/logs/refs -name desktop.ini -delete`. → **Cerrado 2026-09-25:** Marcos confirma que `E:\Drive` ya no sincroniza con Google Drive; los `desktop.ini` eran residuo. El repo se queda donde está.
- [x] **Migrar backlog previo a tracking:** volcar `BACKLOG.md`, `TODO.md` y `ROADMAP.md` (raíz) a este archivo por prioridad, y retirarlos o dejarlos como histórico.
- [x] **Definir `verify.sh` real:** hoy es un stub (`package.json` no tiene test real; hay `tests/` y `jsdom`). Cablear la suite de `tests/` y añadir las directrices `D.*` del Lead Developer.
