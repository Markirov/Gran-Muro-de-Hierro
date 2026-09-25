# Warband Forge (Trench Crusade) — PROJECT.md

> Contenido propio del proyecto. El protocolo núcleo vive en `.agents/AGENTS.md` (no editar). Este archivo nunca lo toca `harness update`.
> Flavor de roles: **lean** (3 roles). Tracking en `tracking/`. El backlog vivo está en `tracking/PENDING.md`; los antiguos `BACKLOG.md`/`TODO.md`/`ROADMAP.md` y la historia de sesiones hasta junio de 2026 están en `archive/`.

## Roles

| Rol | Ámbito | Regla dedicada | ¿Toca código? |
|---|---|---|---|
| **Lead Developer / Arquitecto** | Código, refactors, despliegue, harness | `.agents/rules/lead_developer.md` | **SÍ (único)** |
| **Domain & Product Owner** | Canon del reglamento Trench Crusade, esquemas de warband/campaña, flujos UX, copy | `.agents/rules/domain_owner.md` | No |
| **QA Auditor / Security Reviewer** | Auditoría de código, regresiones, fidelidad canon, consistencia del tracking | `.agents/rules/qa_auditor.md` | No |

---

## Guía del proyecto (heredada del CLAUDE.md original)

Companion para Trench Crusade que se acompaña al builder oficial **Trench Companion** (https://trench-companion.com). No es un builder: importa JSONs de Companion, trackea progresión (XP, advancements, traumas, scars) en campañas y partidas libres, simula batallas en el Lab, y re-exporta a Companion sin pérdida.

El archivo es **single-file HTML**: todo el código vive en `index.html` (~40k líneas). Se despliega como página estática en GitHub Pages (https://markirov.github.io/Gran-Muro-de-Hierro/). No hay backend propio: el estado vive en `localStorage`, con sync opcional del usuario vía GitHub Gist privado o Firebase (Google login + Firestore, SDK cargado por `import()` dinámico).

## Idioma y tono

La UI y los comentarios de código orientados al usuario están en **español**. Los comentarios técnicos internos pueden estar en inglés (ya hay una mezcla histórica). Las pruebas suelen tener mensajes en inglés porque eso facilita escribirlas rápido. Lo importante: si añades strings que el usuario vaya a ver, en español. Lo demás es libre.

El tono con el usuario, Marcos, es de **colaborador técnico**, no de asistente servil. Marcos empuja para atrás cuando se equivoca uno y prefiere prosa explicativa con frases completas a listas de bullets. Cuando algo es una decisión de producto y no un bug, conviene parar y preguntar antes de codificar.

## Mandato canon

Trench Crusade tiene reglamento oficial (los PDFs están en `herramientas/pdfs-reglamento/`, gitignored). El proyecto prioriza **fidelidad canon** sobre conveniencia de implementación. La regla informal es "cuanto más fiel, mejor". Si una mecánica del reglamento parece complicada de modelar, se modela; no se simplifica. Si no se puede modelar fielmente, se omite explícitamente, no se inventa una versión aproximada.

Las fuentes canon principales son `Trench-Crusade-Digital-Rulebook.pdf`, `Warbands-of-Trench-Crusade.pdf`, `RulesCommentaries1_0_2.pdf`, `Changelog1_0_2.pdf`, y los PDFs de bandas específicas (Stosstruppen, Red Brigade, etc.). Cualquier dato canon nuevo se verifica leyendo el PDF, no se asume.

## Arquitectura

El archivo se divide en bloques marcados con cabeceras `/* === RENDERING === */` y `/* === CAMPAIGN MODULE === */`. La función `boot()` al final del script es el punto de entrada que toca el DOM. Todo lo que está antes de `boot()` es código puro o registro de event listeners.

Conceptualmente hay tres capas. Una capa de **datos canon** en constantes como `DATA`, `CAMPAIGN_TABLES`, `ENEMY_FACTORIES`, que no muta. Una capa de **lógica de banda y motor** con funciones puras como `newWarband`, `applyVariantBonus`, `applyInjury_lab`, `runBattleSeries_lab`, `resolveExplorationRoll`. Y una capa de **persistencia y UI** con `persistWarband`, `loadWarband`, `renderQM`, los modales y los event handlers. La capa de motor no toca el DOM ni `localStorage` directamente, lo que la hace fácil de testear.

La progresión se modela a nivel de banda. Una banda persiste su XP, ducats, glory y descubrimientos. Las campañas son contenedores narrativos con su propia lista de batallas (referenciadas por warbandId), no son la unidad de progresión. Una banda puede estar en cero, una o varias campañas y además tener su propio array `freeBattles` de partidas libres.

## Patrón TDD obligatorio

Regla D.2 de `.agents/rules/lead_developer.md`: cada cambio mecánico empieza por un test rojo en `tests/test_<tema>.js`. Patrón **module-style** (extrae el script de `index.html`, corta en `bootIdx = js.search(/\nfunction boot\(\)/)`, escribe a un archivo temporal con `module.exports`, mockea `localStorage` en memoria; ref. `test_campaign_game.js`, `test_free_battles_model.js`) cuando la lógica es pura o necesita round-trips de `localStorage`. Patrón **jsdom-style** (script completo en un `window`, expuesto vía `window.__lib`; ref. `test_breadcrumb.js`, `test_exploration_canon.js`) cuando hay DOM. Con jsdom, nunca `global.localStorage = window.localStorage`. Si el test necesita `CAMPAIGN_TABLES`, corta por `bootIdx`, no por el marcador `RENDERING`.

Verificación: `bash verify.sh` (sintaxis del `<script>` + suite completa). Estado a 2026-09-25: **142 suites · 2613 verificaciones · 0 failures**, ~2 min.

## Convenciones de código

Los modelos en una banda tienen `id`, `name`, `cost`, `meleeDice`, `rangedDice`, `armour`, `weapons` (array), `keywords` (Set), `bloodMarkers`, `isDown`, `isOut`, y un grupo de flags booleanos para habilidades especiales (`tough`, `wrathOfGod`, `dayOfHisWrath`, `layingOnOfHands`, `punishingMillstones`, etc.). Los flags se setean en `applyVariantBonus` o al construir la banda y los consume el motor de simulación. La regla es que **el motor consulta flags, no nombres** — nunca chequear `m.name === 'Castigator'` dentro de `applyInjury_lab`; en su lugar setear `m.tough = true` en `applyVariantBonus` y consultar el flag.

Las weapons en simulación tienen estructura `{ name, isRanged, range, diceMod, injuryDice, injuryMod, keywords: Set }`. Los keywords son strings como `'HEAVY'`, `'IGNORE ARMOUR'`, `'BLAST 3"'`, `'FIRE'`, `'STRONG'`.

La progresión del modelo vive en `m.baseProgression`, que tiene `xp`, `advancements` (lista de `{id, name, ...}`), `scars` (lista similar), `cannotGainXp` (boolean por Head Wound). Esta es la única parte que **no** se exporta a Companion en el round-trip — Companion no entiende progresión.

Los ids son cortos y prefijo-anotados: warbands `wb_<ts36>`, free battles `fb_<ts36>_<rand>`, campaigns `cmp_<ts36>`. El timestamp en base 36 te da unicidad sin colisiones realistas.

## Estado actual (2026-09-25)

Todo el roadmap histórico está cerrado: progresión libre (Fases 1-10 del CLAUDE.md original), PIVOT v2 (Fases 9-15: import/refresh desde TC, sandbox de variantes, lista de la compra + PDF, badges, onboarding), SPEC rediseño UI (A-I), paletas y ornamentos de todas las variantes, placeholders WWI, Glosario PDF, top-bar agrupada, sync Gist/Firebase, Trauma D66 canon en el wizard y house rules de Trauma por campaña. **Lab 2.0 espacial** (sprints 1-33): mapas JSON con alturas, LoS/cover, IA heurística con sesgo, replay 2D en Canvas, keywords BLAST/FIRE/AUTOMATIC/MINED/CLEAVE/REGENERATE, sandbox de variantes, export PNG/JSON. Último bloque de junio: secuencia canon entre batallas de campaña (Advancement Roll, Patrones, glory por Glorious Deed), variante Defenders of the Iron Wall con armería propia, y pulido del wizard post-batalla.

Lo pendiente vive en `tracking/PENDING.md`; lo especulativo en `tracking/IDEAS.md`.

## Fixtures

Bandas reales exportadas de Trench Companion en `Bandas/` (Cazadores del Muro, Herejes Infernales, Protectores del Muro, Defensores de la Puerta, Moldeadores de la Carne). **Cazadores del Muro** (warband-id 299495) y **Herejes Infernales** (warband-id 297322) son los fixtures canónicos de integración.

## Estructura del repo

Raíz: `index.html`, `README.md`, `LICENSE`, `package.json`, `verify.sh`, `init.sh`, `Bandas/`, `tests/`, `scripts/` (check-syntax + git hooks), `tracking/`, `archive/`, `.agents/`. Gitignored: `herramientas/` (PDFs canon, guías, SPECs/PLANs/HANDOFFs, samples, legacy), `STLs/`, `assets/wwi-placeholders/`, PDFs generados.

**Nota:** `E:\Drive` fue carpeta sincronizada de Google Drive y dejó `desktop.ini` residuales dentro de `.git/` (ya no sincroniza). Si git da `bad ref refs/desktop.ini`, borrar los `desktop.ini` de `.git/refs` y `.git/logs/refs`.
