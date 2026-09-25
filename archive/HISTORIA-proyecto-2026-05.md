# Historia del proyecto hasta 2026-06

> Secciones de estado/roadmap del `CLAUDE.md` original (movidas desde `.agents/PROJECT.md` el 2026-09-25). Histórico: todo lo listado como pendiente aquí está cerrado o migrado a `tracking/PENDING.md`.

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

**Pendiente menor — todo cerrado en sesión 2026-05-18** (ver más abajo):
- ~~Sub-Fase 12-D: integración Lab variante vs canon~~ → ya estaba wired (línea 21080+ del sandbox handler) con tests test_pivot_fase12d_lab_compare.js + test_pivot_fase12_sandbox_ui.js (36 verifs entre ambos). CLAUDE.md estaba stale.
- ~~Banner Post Game Reporter en modal campañas~~ → añadido bloque `.post-game-reporter-banner` antes de los inputs en `#modal-new-campaign` con link a trench-companion.com (commit e4f24df).
- ~~README.md~~ → existe en la raíz del repo + LICENSE MIT.

## Reorganización del repo (2026-05-15)

`herramientas/` (gitignored) contiene: `pdfs-reglamento/` (canon PDFs), `guias-canon/` (skills + escenarios derivados), `specs-y-plans/` (SPECs + PLANs + PIVOTs + CATALOGOs + HANDOFFs), `samples/` (PNGs + PDFs generados de prueba), `legacy/` (prototipos antiguos: auditor.html, analyzer.html, dugout.py).

`.gitignore` ahora cubre: `herramientas/`, `STLs/`, `.claude/`, `assets/wwi-placeholders/`, `tarjetas-*.pdf`, `battletrackers-*.pdf`, `desktop.ini` recursive, PDFs canon individuales como red de seguridad.

Root tras limpieza: `index.html`, `CLAUDE.md`, `BACKLOG.md`, `ROADMAP.md`, `README.md`, `LICENSE`, `package.json`, `Bandas/` (fixtures), `tests/` (suite completa, ~100 archivos `test_*.js`).

## Sesión 2026-05-18 — Cierre completo de backlog roadmap

Sesión orientada a barrer los ítems "Alta prio" y "Baja prio" del `ROADMAP.md`. Resultado: 6 commits, +263 verificaciones, 0 regresiones netas (2 bugs colaterales cazados y corregidos).

| Commit | Verifs | Tema |
|---|---|---|
| b188724 | 21 | Sub-G SPEC rediseño UI — test funcional render Lista compra (cierra la última sub-tarea sin test propio del SPEC). |
| e4f24df | 12 | Banner Post Game Reporter en modal Nueva Campaña — recomienda registrar XP/avances oficiales en TC. |
| 1aa35e6 | 30 | Paridad VARIANT_PALETTES vs VARIANT_FACTION_RULES: añadidas 3 paletas + 3 ornamentos canon (Red Brigade red_star_hammer; Great Hegemon plague_banner; Great Hunger gluttony_maw). |
| 0bf683f | 115 | FACTION_PLACEHOLDERS poblados con 64 imágenes WWI dominio público en `assets/wwi-placeholders/` (gitignored). Mapeo canon-grimdark: NA→Aliados, IS→Otomano, HL→Imperios Centrales, BG→MG/gas/devastación, TC→Maxim/Vickers nobles. |
| 190177a | 74 | 13 paletas restantes + 6 ornamentos: Trench Pilgrims (sacred-affliction thorn_crown, st-methodius orthodox_cross, tenth-plague lamb_skull); Heretic Legions vars (trench-ghosts ghost_mask, avarice-knights coin_stack, naval-raiders anchor_skull); The Court 7 Sins (comparten seven_headed_serpent, diferenciados por color VARIANT). |
| 92a668e | 11 | Pestaña "📚 Campañas" plural en nav principal + fix regresión Sub-C (CSS ocultaba panel-catalogue/roster/detail en mode-campana, dejando la vista en blanco). |

**Bugs colaterales cazados y corregidos**:
1. **Alias court-serpent ↔ the-court**: el factionId real en DATA es `court-serpent` pero FACTION_PALETTES + FACTION_PLACEHOLDERS sólo tenían entrada `the-court`. Bandas de The Court caían al fallback de New Antioch silenciosamente. Añadido alias en ambos diccionarios (commit 190177a).
2. **Regresión Sub-C en mode-campana**: la regla CSS introducida en el rediseño UI Sub-C ocultaba `#panel-catalogue`, `#panel-roster`, `#panel-detail` cuando el body tenía clase `mode-campana`. El módulo de campaña usa precisamente esos 3 paneles para Lista/Centro/Detalle. La pestaña Campaña quedaba en blanco. Regla reescrita para ocultar SOLO variantes + shopping + lab + battle (commit 92a668e).

**Auditoría inicial del estado del backlog**:
- SPEC rediseño UI sub-tareas A-I: todas estaban implementadas. Sólo faltaba el test funcional Sub-G.
- Sub-Fase 12-D Lab compare: ya estaba completa (sandbox handler + tests). CLAUDE.md decía "pendiente" — stale.
- Disclaimer fan-made footer: ya existía como toast + modal.
- README.md y LICENSE: ya existían.

**Suite final**: 99 suites · 1800 verifications · 0 failures.

**Backlog tras esta sesión**:
- Validación física en mesa (imprimir tarjetas Cazadores + Herejes, jugar 2-3 partidas). No codeable.
- Lab 2.0 espacial (idea futura, 3-6 sprints, ver ROADMAP.md sección 6).
- Glossary PDF y house rules partida libre (baja prio futuro).
