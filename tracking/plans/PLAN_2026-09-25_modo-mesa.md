# PLAN — Modo mesa (ficha móvil por miniatura)

**Fecha:** 2026-09-25 · **Rol:** Lead Developer (Claude Code) · **Diseño acordado con:** Marcos (brainstorming 2026-09-25)

## Objetivo

Durante una partida física, Marcos abre Forge en su móvil Android (GitHub Pages, Chrome), pulsa "📱 Modo mesa" y obtiene una vista a pantalla completa con **una miniatura por pantalla**. Desliza izquierda/derecha para pasar de ficha y, en cada una, marca el estado de la miniatura durante el turno. Sin pasar archivos entre dispositivos, sin conexión necesaria una vez cargada la página.

**Criterio de éxito:** con `Bandas/Caza2.json` (9 modelos) en viewport 375×812, se puede recorrer toda la banda deslizando, marcar activación / sangre / estado / efectos / usos con el pulgar, pasar turno, recargar la página y reabrir el modo mesa con todo el estado intacto.

## Decisiones cerradas

1. **Opción A:** el estado es solo de la partida; vive en el móvil y **no vuelve a Forge** (no toca `wb`, no afecta a guardado, historial ni export a Companion — regla D.7).
2. **Vista dentro de Forge** (overlay a pantalla completa), no un archivo HTML generado: más robusto en Android (la pestaña de un blob se pierde si Chrome la descarta).
3. **Marcadores V1:** estado de combate, activación por turno, efectos y usos. **Sin** registro de kills/Deeds.
4. **Lista de efectos = la del battletracker PDF:** BLES, AIM, MEM, FEAR, CHARGED, OTRO; más FIRE, GAS, SHRAPNEL si `hasElementalMastery`.
5. **Pasar turno solo limpia activaciones.** Efectos, sangre y usos gastados los retira Marcos a mano.

## Diseño

### 1 · Interfaz

**Entrada:** botón `#btn-table-mode` "📱 Modo mesa" en el grupo de impresión (`data-action-group="impresion"`), junto a Tarjetas/Battletrackers/Glosario. Sin banda o sin modelos → `alert('La banda no tiene modelos.')`, igual que los botones PDF.

**Overlay** `#table-mode` (a pantalla completa, `position: fixed; inset: 0`, por encima de todo, portrait). Botón ✕ cierra y vuelve a Forge. Bloquea el scroll del body mientras está abierto.

**Cabecera fija:**
- Nombre de banda · "Turno N".
- Contador "X/Y activadas" (Y excluye modelos Fuera de combate).
- Botón "Pasar turno" (con `confirm`): turno +1, desmarca activaciones.
- Botón "Nueva partida" (con `confirm`): borra la sesión, turno 1, todo limpio.
- Si `localStorage` no está disponible: aviso fijo "Sin guardado: el progreso se perderá al cerrar".

**Carrusel:** contenedor horizontal con `scroll-snap-type: x mandatory`, cada ficha `width: 100%` y `scroll-snap-align: center`. Sin librerías. Debajo, fila de puntos: actual resaltado, activadas marcadas, fuera de combate atenuadas; tocar un punto hace `scrollIntoView` de esa ficha. El punto actual se sincroniza con `IntersectionObserver` (o `scroll` + cálculo de índice como fallback).

**Ficha (orden vertical):**
1. Nombre + rol; fila de stats grande MOV · RNG · MEL · ARM.
2. Botón grande **"Activado"** (toggle, estado visual encendido/apagado).
3. **Estado de combate:** segmentado En pie / Down / Fuera de combate. Down → tinte ámbar de la ficha. Fuera → ficha gris y todos los controles deshabilitados **salvo** el segmentado (para corregir). Blood markers: `−` [n] `+`.
4. **Efectos:** chips toggle con la lista de la decisión 4.
5. **Habilidades de un uso:** chips; al tocar quedan tachados (gastado). Tocar de nuevo los recupera.
6. **Consulta** (`<details>` plegado por defecto): armas (nombre, alcance, dados, herida, keywords) y habilidades con descripción.

Objetivos táctiles ≥ 44 px. Textos en español. Colores vía la paleta de facción existente cuando sea directo; si no, los tokens CSS del tema actual.

### 2 · Estado y datos

**Persistencia:** `localStorage['wf-mesa-' + wb.id]`, JSON. Toda lectura/escritura en `try/catch`.

```js
{ v: 1, warbandId, startedAt, turn: 1,
  models: { [model.uid]: { activated: false, blood: 0, status: 'up', effects: [], spent: [] } } }
```
`status ∈ 'up' | 'down' | 'out'`. `effects` = códigos de la lista de efectos. `spent` = nombres de habilidad de un uso gastadas.

**Funciones puras** (antes de `boot()`, sin DOM ni `localStorage`; reciben y devuelven la sesión):
- `newTableSession(wb)` → sesión en turno 1 con estado por defecto para cada `model.uid`.
- `syncTableSession(session, wb)` → añade modelos nuevos con estado por defecto; los que ya no existen en `wb.models` se ignoran al renderizar (no se borran, por si vuelven).
- `getTableModelState(session, uid)` → estado del modelo (por defecto si falta).
- `toggleTableActivated(session, uid)`.
- `adjustTableBlood(session, uid, delta)` → nunca por debajo de 0.
- `setTableStatus(session, uid, status)` → ignora valores fuera de la enumeración.
- `toggleTableEffect(session, uid, code)`.
- `toggleTableSpent(session, uid, abilityName)`.
- `advanceTableTurn(session)` → `turn + 1`, `activated = false` en todos; resto intacto.
- `tableActivationCount(session, wb)` → `{ activated, total }` sobre modelos presentes en `wb` con `status !== 'out'`.
- `getTableEffectCodes(cardData)` → lista base + elementales si `hasElementalMastery`.

**Persistencia (capa UI):** `loadTableSession(wb)` (lee, valida `v === 1` y `warbandId`; si no vale → `newTableSession`), `saveTableSession(session)`, `clearTableSession(wb)`. Cada interacción: función pura → `saveTableSession` → re-render de la ficha afectada, la cabecera y los puntos.

**Datos mostrados:** `buildModelCardData(model, wb)` (misma fuente que las tarjetas PDF): `stats`, `weapons`, `abilities`, `oneShotAbilities`, `hasElementalMastery`, `nameL1/nameL2`, `role`.

### 3 · Pruebas

- `tests/test_mesa_state.js` (module-style, `localStorage` simulado): creación desde banda con `uid`s, toggles, sangre ≥ 0, estados inválidos ignorados, pasar turno solo limpia activaciones, contador excluye Fuera, sync con modelo añadido/quitado, lista de efectos con/sin Maestro de Elementos, round-trip `save`/`load`, sesión de otra banda o versión → nueva sesión, `clear` → turno 1.
- `tests/test_mesa_ui.js` (jsdom): botón presente y cableado; abrir con banda de N modelos pinta N fichas con sus stats; tocar "Activado" actualiza ficha, contador y `localStorage`; Fuera deshabilita controles salvo el segmentado; "Pasar turno" con `confirm` aceptado limpia activaciones y sube el turno; cerrar y reabrir conserva el estado.
- Manual: navegador a 375×812 con `Bandas/Caza2.json` — deslizamiento y encaje, puntos, objetivos táctiles, recarga y reapertura.
- `bash verify.sh` verde antes de cerrar.

## Fuera de alcance V1 (→ `tracking/IDEAS.md`)

Registro de kills/Deeds para XP · volcar resultado al asistente post-batalla (opción B) · descargar como archivo HTML · limpieza automática de marcadores por turno · banda enemiga · modo horizontal.

## Tareas (checklist de implementación)

Diseño aprobado por Marcos el 2026-09-25 ("Implementa").

**Fase 1 — Lógica pura**
- [x] 1.1 `tests/test_mesa_state.js` en rojo (helpers puros + persistencia con `localStorage` simulado).
- [x] 1.2 Implementar helpers puros y `getTableEffectCodes` antes de `boot()`.
- [x] 1.3 Implementar `loadTableSession` / `saveTableSession` / `clearTableSession`. Test en verde.

**Fase 2 — Interfaz**
- [x] 2.1 `tests/test_mesa_ui.js` en rojo (jsdom).
- [x] 2.2 Botón `#btn-table-mode` + overlay `#table-mode` + CSS móvil (scroll-snap, ≥44 px, tintes Down/Fuera).
- [x] 2.3 Render de cabecera, carrusel, fichas y puntos; handlers de todos los controles. Test en verde.

**Fase 3 — Cierre**
- [x] 3.1 Prueba manual a 375×812 con `Bandas/Caza2.json` (swipe, puntos, recarga y reapertura).
- [x] 3.2 `bash verify.sh` verde; fuera de alcance a `IDEAS.md`; DONE + PENDING + commit + push.
