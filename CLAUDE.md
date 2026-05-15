# Warband Forge — Guía para Claude Code

Companion para Trench Crusade que se acompaña al builder oficial **Trench Companion** (https://trench-companion.com). No es un builder: importa JSONs de Companion, trackea progresión (XP, advancements, traumas, scars) en campañas y partidas libres, simula batallas en el Lab, y re-exporta a Companion sin pérdida.

El archivo es **single-file HTML**: todo el código vive en `index.html` (~27k líneas). Se despliega como página estática (GitHub Pages, Netlify). No hay backend, no hay base de datos — todo en `localStorage`.

## Idioma y tono

La UI y los comentarios de código orientados al usuario están en **español**. Los comentarios técnicos internos pueden estar en inglés (ya hay una mezcla histórica). Las pruebas suelen tener mensajes en inglés porque eso facilita escribirlas rápido. Lo importante: si añades strings que el usuario vaya a ver, en español. Lo demás es libre.

El tono con el usuario, Marcos, es de **colaborador técnico**, no de asistente servil. Marcos empuja para atrás cuando se equivoca uno y prefiere prosa explicativa con frases completas a listas de bullets. Cuando algo es una decisión de producto y no un bug, conviene parar y preguntar antes de codificar.

## Mandato canon

Trench Crusade tiene reglamento oficial (los PDFs están en `/mnt/user-data/uploads/` o equivalente en el repo). El proyecto prioriza **fidelidad canon** sobre conveniencia de implementación. La regla informal es "cuanto más fiel, mejor". Si una mecánica del reglamento parece complicada de modelar, se modela; no se simplifica. Si no se puede modelar fielmente, se omite explícitamente, no se inventa una versión aproximada.

Las fuentes canon principales son `Trench-Crusade-Digital-Rulebook.pdf`, `Warbands-of-Trench-Crusade.pdf`, `RulesCommentaries1_0_2.pdf`, `Changelog1_0_2.pdf`, y los PDFs de bandas específicas (Stosstruppen, Red Brigade, etc.). Cualquier dato canon nuevo se verifica leyendo el PDF, no se asume.

## Arquitectura

El archivo se divide en bloques marcados con cabeceras `/* === RENDERING === */` y `/* === CAMPAIGN MODULE === */`. La función `boot()` al final del script es el punto de entrada que toca el DOM. Todo lo que está antes de `boot()` es código puro o registro de event listeners.

Conceptualmente hay tres capas. Una capa de **datos canon** en constantes como `DATA`, `CAMPAIGN_TABLES`, `ENEMY_FACTORIES`, que no muta. Una capa de **lógica de banda y motor** con funciones puras como `newWarband`, `applyVariantBonus`, `applyInjury_lab`, `runBattleSeries_lab`, `resolveExplorationRoll`. Y una capa de **persistencia y UI** con `persistWarband`, `loadWarband`, `renderQM`, los modales y los event handlers. La capa de motor no toca el DOM ni `localStorage` directamente, lo que la hace fácil de testear.

La progresión se modela a nivel de banda. Una banda persiste su XP, ducats, glory y descubrimientos. Las campañas son contenedores narrativos con su propia lista de batallas (referenciadas por warbandId), no son la unidad de progresión. Una banda puede estar en cero, una o varias campañas y además tener su propio array `freeBattles` de partidas libres.

## Patrón TDD obligatorio

Cada cambio mecánico nuevo se hace con tests primero. La suite vive en `/home/claude/` (en Claude Code: equivalente local del repo) y los archivos siguen el patrón `test_*.js`. Hay dos patrones de test según lo que necesites.

El patrón **module-style** lo usas cuando necesitas `localStorage` real con round-trips. Lee el HTML, extrae el script, corta en `bootIdx = js.search(/\nfunction boot\(\)/)`, escribe el código en `/tmp/algo_test.js` con un `module.exports = {...}` al final, y haz `require('/tmp/algo_test.js')`. Mockea `localStorage` como objeto en memoria. Mira `test_campaign_game.js` o `test_free_battles_model.js` como referencia.

El patrón **jsdom-style** lo usas para tests que tocan DOM o que necesitan que el script entero se evalúe en un contexto window. Importa `JSDOM`, crea el dom desde el HTML, expón las cosas via `window.__lib = {...}`. Mira `test_breadcrumb.js` o `test_exploration_canon.js` como referencia. **Cuidado**: no asignes `global.localStorage = window.localStorage` con jsdom porque rompe.

Si tu test necesita `CAMPAIGN_TABLES` (que está después del marcador `RENDERING`), usa `bootIdx` en lugar del corte por `RENDERING`. El marcador `RENDERING` corta antes del módulo de campaña; `bootIdx` lo incluye.

El runner de la suite es trivial:

```bash
cd /home/claude/tests && timeout 240 bash -c '
total=0; suites=0; failed=0; failed_names=""
for t in test_*.js; do
  if grep -q "process.exit" "$t"; then
    suites=$((suites+1))
    out=$(timeout 30 node "$t" 2>&1)
    code=$?
    count=$(echo "$out" | grep -c "✓ ")
    total=$((total + count))
    if [ $code -ne 0 ]; then failed=$((failed+1)); failed_names="$failed_names $t"; fi
  fi
done
echo "$suites suites · $total verifications · $failed failures"
[ -n "$failed_names" ] && echo "Failed:$failed_names"'
```

Estado actual de la suite al cerrar esta fase: **110 suites · 3170 verificaciones · 0 failures**.

## Convenciones de código

Los modelos en una banda tienen `id`, `name`, `cost`, `meleeDice`, `rangedDice`, `armour`, `weapons` (array), `keywords` (Set), `bloodMarkers`, `isDown`, `isOut`, y un grupo de flags booleanos para habilidades especiales (`tough`, `wrathOfGod`, `dayOfHisWrath`, `layingOnOfHands`, `punishingMillstones`, etc.). Los flags se setean en `applyVariantBonus` o al construir la banda y los consume el motor de simulación. La regla es que **el motor consulta flags, no nombres** — nunca chequear `m.name === 'Castigator'` dentro de `applyInjury_lab`; en su lugar setear `m.tough = true` en `applyVariantBonus` y consultar el flag.

Las weapons en simulación tienen estructura `{ name, isRanged, range, diceMod, injuryDice, injuryMod, keywords: Set }`. Los keywords son strings como `'HEAVY'`, `'IGNORE ARMOUR'`, `'BLAST 3"'`, `'FIRE'`, `'STRONG'`.

La progresión del modelo vive en `m.baseProgression`, que tiene `xp`, `advancements` (lista de `{id, name, ...}`), `scars` (lista similar), `cannotGainXp` (boolean por Head Wound). Esta es la única parte que **no** se exporta a Companion en el round-trip — Companion no entiende progresión.

Los ids son cortos y prefijo-anotados: warbands `wb_<ts36>`, free battles `fb_<ts36>_<rand>`, campaigns `cmp_<ts36>`. El timestamp en base 36 te da unicidad sin colisiones realistas.

## Estado actual del proyecto

Variantes implementadas en `applyVariantBonus`: New Antioch (Defensores del Iron Wall, Alba, Stosstruppen Prussia, Éire Rangers, Red Brigade), Heretic Legions (Trench Ghosts, Knights of Avarice, Naval Raiders), Trench Pilgrims (Procession of the Sacred Affliction, War Pilgrimage of Saint Methodius, Cavalcade of the Tenth Plague). Cada una con su test correspondiente y validación cruzada en el Lab.

Lab completo con análisis de duelo, comparativa entre bandas, matriz de coverage por escenario, heurísticas tácticas, simulación de hasta 5000 batallas, history con delta vs anterior, recomendador de battlekit (Battlekit Deltas), Loadout Lab para optimización de equipo por modelo.

Battle Tracker funcional con selector de escenario, registro de bajas/kills/Deeds, cálculo de XP canon-correct, Trauma Step con tabla D66, Promotion Pool widget, aplicación de XP a la banda.

Campañas con creación, persistencia, lista de batallas, computación de estado de banda por replay, Quartermaster Step con compras/ventas y FinanceEntry tracking.

**Fase 1 de progresión libre (esta sesión)**: tablas canon de Exploration en `CAMPAIGN_TABLES.explorationTables` con Common (11 entradas + 4 con forks), Rare (11), Legendary (7). Engine con `determineExplorationDice`, `selectExplorationTable`, `rollExplorationDice`, `resolveExplorationRoll`. Test `test_exploration_canon.js` con 8 grupos.

**Fase 2 de progresión libre (esta sesión)**: modelo de partidas libres. `newWarband` inicializa `freeBattles`, `discoveredLocations`, `campaignIds`. `migrateWarband` backfill para bandas legacy. Funciones `createFreeBattle`, `addFreeBattle`, `getTotalBattleCount`, `getEffectiveGameNumber`. Test `test_free_battles_model.js` con 9 grupos.

## Roadmap pendiente

**Fase 3 — Wizard de partida libre**. Modal de inicio con campos: nombre opcional (placeholder con auto-generado), oponente (string libre), escenario (selector reutilizando los 12 canónicos), slider de Exploration Dice 1-10 (default 3). Confirmación antes de empezar para evitar continuar automático. Botón "Empezar partida libre" en cada banda. El contexto activo de la batalla se guarda en una variable in-memory tipo `LIVE_FREE_BATTLE` (no persistente — si refrescas pierdes la batalla actual, igual que el Battle Tracker actual).

**Fase 4 — Asistente post-batalla unificado**. Reorganizar el flujo actual de Battle Tracker en un wizard lineal de pasos: Trauma → Promotions/XP → Exploration → Quartermaster → Resumen. Cada paso con botón "Saltar" donde aplica. El mismo asistente sirve para batallas de campaña y libres, sólo cambia el contexto.

**Fase 5 — Modal de Exploration**. UI completa con animación de dados, botones de re-roll (con indicador de cuántos quedan: uno general + uno por victoria), modal de selección de opciones canon cuando la entrada tiene varias, manejo de pillaged con tarjeta narrativa, manejo de forks ("Ya saqueado, pero descubres una variante...") aplicando el efecto del fork. Conectar con `wb.discoveredLocations` para añadir las keys nuevas.

**Fase 6 — Lista de la compra**. Marcos pidió esto explícitamente. Modelo: `wb.shoppingList: [{ modelUid, kitId, priority, addedAt }, ...]`. En Quartermaster, columna derecha con lista ordenada por prioridad, drag-and-drop para reordenar, botón comprar (activo si hay ducados suficientes, deshabilitado con "faltan N 👑" si no). Click compra → descuenta del strongbox, equipa, elimina de lista. Botón "+ Lista de la compra" en la vista de modelo para añadir desde fuera. Toast post-batalla notificando ducats ganados vs items pendientes.

**Fase 7 — Vista de campañas y vista de historial de banda**. Pestaña fija en nav principal con "Mis campañas". Botón "Campañas" en cada banda con filtro a las que esa banda participa. Vista "Historial" por banda con lista cronológica de todas las batallas (libres + de cada campaña) con badge de origen ("Campaña Crucible · Batalla 4" o "Libre · 8 may").

**Fase 8 — Borrado de campaña con conversión a libres**. Cuando se borre una campaña, sus batallas se convierten en partidas libres de cada banda participante (preservando XP, fechas, oponente, etc.). Confirmación clara que advierta que el progreso se conserva pero la estructura de campaña desaparece.

**Fase 9 — Patron y Glory Items en libre**. En el motor, las partidas libres ya excluyen Glory Items (filtrado por contexto). Falta asegurar en la UI que el wizard no permita seleccionar dados de Patron (canon extendido: en libre se forrajea entre encargos del Patron, no se reciben dados de Patron). Y verificar que el Quartermaster en libre no muestre la sección de Glory Items.

**Fase 10 — `BACKLOG.md`**. Crear el archivo del proyecto con todo el pendiente post-Mordheim, en orden de prioridad. La primera entrada debe ser **respaldo de datos en GitHub/Netlify** (Marcos pidió recordatorio explícito tras esta fase). Otros pendientes históricos: Goetic Spells (Court Sorcerer), Eye of Beelzebub (Black Grail Antipope), Fortify ACTION (Combat Engineer), más escenarios (V Armoured Train, VI Dragon Hunt, IX Fields of Glory), variantes de Court of the Seven-Headed Serpent, variantes de Black Grail (Dirge of the Great Hegemon, The Great Hunger), Iron Sultanate House of Wisdom y Fida'i of Alamut, modelado de Concentrated Attack y Fireteams.

## Tareas inmediatas para empezar en Code

Antes de tocar la Fase 3, lo primero es **mover el proyecto a un repo de Git**. Si no está ya en uno, crea uno local con `git init`, haz commit del estado actual, conéctalo a GitHub. Esto te da control de versiones y backup automático con cada `git push`.

Después, **abre el repo con Claude Code** desde la app de escritorio. La primera sesión Claude leerá este `CLAUDE.md` y tendrá todo el contexto necesario. Puedes verificar que entiende dónde estamos haciéndole una pregunta de control, por ejemplo "¿Qué fase de progresión libre terminamos?", y la respuesta debería mencionar Fase 1 y 2 con el detalle correcto.

Cuando arranques Fase 3 (wizard de partida libre), el primer test va antes que el código: crea `test_free_battle_wizard.js` que verifique que el modal aparece, que recibe los datos, que crea un objeto `LIVE_FREE_BATTLE` con la forma correcta. La UI viene después de tener los tests verdes.

## Comando útil para verificar estado

```bash
# Líneas del archivo
wc -l index.html

# Conteo de tests
ls tests/test_*.js | wc -l

# Suite completa (debe terminar en 0 failures)
[ver script más arriba]

# Buscar dónde está implementada una variante o función
grep -n "function applyVariantBonus\|sacred-affliction\|punishingMillstones" index.html | head
```

## Una nota sobre fixtures

Hay dos warbands de prueba que conviene tener a mano en `/home/claude/fixtures/`: `alba.json` (Alba go Brah!, Highland New Antioch, 9 modelos, 701 ducats) y `protectores.json` (Protectores del Muro, Iron Sultanate Defenders of the Iron Wall, 9 modelos, 700 ducats). Son JSONs exportados de Companion que sirven para probar el flujo de importación y para tener bandas reales con las que jugar el modo de partida libre cuando esté implementado.

---

## Estado tras PIVOT v2 (2026-05-15)

El proyecto se ha reposicionado como **companion físico-experimental** de Trench Companion. Filosofía actual:

> Trench Companion construye la banda. Warband Forge la lleva a la mesa, le deja experimentar, y te recuerda qué comprar.

Documento maestro: `herramientas/specs-y-plans/PIVOT-companion-of-tc-v2.md`.

**Fases PIVOT v2 cerradas en esta sesión** (commits en main):

- **Fase 9** — UX import desde TC. `parseCompanionJson` valida `warband-id`. `refreshCompanionWarband(wb, json, opts)` re-importa preservando estado local (variantes + lista compra + freeBattles + campaignIds + discoveredLocations). Drag&drop archivo JSON sobre ventana + overlay visual. Botón "🔄 Refrescar de Companion" en header. Modal con checkboxes de preservación selectiva (decisión 5: Marcos elige qué conservar).
- **Fase 10** — TC como verdad oficial. `modelCost` prefiere `model.companionCost`/`companionGlory` si banda viene de TC. `canAddUnitWithWarning(wb, unit)` devuelve `{canAdd, warning?}`. Bandas Companion permiten todo + warning informativo; bandas locales bloqueo estricto.
- **Fase 11** — Modelo datos sandbox + wishlist. `wb.experimentalVariants[]` inicializado en `newWarband` + `migrateWarband`. Helpers: `createVariant`, `getVariant`, `removeVariant`, `addShoppingItem`, `removeShoppingItem`, `toggleShoppingItemChecked`. Schemas Variant + ShoppingItem en JSDoc.
- **Fase 12** — Sandbox loadouts experimentales. 12-A: `applyVariantOverrides` (deep clone, canon nunca muta), `getVariantDiff`, `promoteVariantToShoppingList`. 12-B: modal "🧪 Variantes" con CRUD básico. 12-C: editor JSON inline + duplicar variante.
- **Fase 13** — Lista compra. 13-A: `groupShoppingItems(wb)` → `{manual, byVariant, historico}`. Items checked van a "Histórico" (decisión 1). `clearCheckedShoppingItems`. Modal "🛒 Lista compra" con render por secciones, add/remove/toggle. 13-B: `generateShoppingListPdf(wb)` A4 portrait con casillas físicas + notas vacías para precios/códigos.
- **Fase 14** — Badges + footer + banner offline. `warbandSourceBadgeHtml(wb)` muestra "🔗 TC sync" vs "💾 Local". Footer reescrito a "Companion offline para Trench Crusade" + link. Botón "Nueva Manual" muestra confirm explicativo recomendando TC para gestión oficial.
- **Fase 15** — Onboarding. Modal "👋 Bienvenido" con flujo TC→Forge→mesa en 9 pasos. Auto-show primera visita (localStorage `wf-tour-seen`). Botón "❓ Ayuda" en header re-abre.

**Decisiones de diseño confirmadas con Marcos**:
1. Items tachados → sección "Histórico" plegable (NO default doc).
2. Lista compra por banda (default doc, ya en `wb.shoppingList`).
3. Variantes pueden añadir modelos (cualquier modelo, no solo mercenarios) + cambiar equipo.
4. Promover variante añade items a lista, canon NO se toca.
5. Re-import pregunta qué conservar (checkboxes en modal).

**Suite tras PIVOT v2**: 77+ suites · 1248+ verifications · 0 failures.

**Pendiente menor**:
- Sub-Fase 12-D: integración Lab variante vs canon (comparativa directa en simulador). Lógica `runCompare_lab` ya existe; solo wire UI.
- Banner Post Game Reporter en modal campañas (recomendar TC para tracking oficial).
- README.md (no existe — CLAUDE.md hace de readme técnico).

## Reorganización del repo (2026-05-15)

`herramientas/` (gitignored) contiene: `pdfs-reglamento/` (canon PDFs), `guias-canon/` (skills + escenarios derivados), `specs-y-plans/` (SPECs + PLANs + PIVOTs + CATALOGOs + HANDOFFs), `samples/` (PNGs + PDFs generados de prueba), `legacy/` (prototipos antiguos: auditor.html, analyzer.html, dugout.py).

`.gitignore` ahora cubre: `herramientas/`, `STLs/`, `.claude/`, `assets/wwi-placeholders/`, `tarjetas-*.pdf`, `battletrackers-*.pdf`, `desktop.ini` recursive, PDFs canon individuales como red de seguridad.

Root tras limpieza: `index.html`, `CLAUDE.md`, `BACKLOG.md`, `package.json`, `Bandas/` (fixtures), `tests/` (suite completa, 80 archivos `test_*.js`).
