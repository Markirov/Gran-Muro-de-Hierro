# Warband Forge — Roadmap y estado del proyecto

> Documento maestro de estado, planificación y backlog. Consolida TODO previo,
> BACKLOG de Code, pendientes de CLAUDE.md y HANDOFF de sesiones anteriores.
> Lectura única para saber dónde está el proyecto y qué viene a continuación.

---

## 1. Snapshot del proyecto

- **Versión actual**: post-integración de tarjetas y battletrackers (Fases 1-8), post-fix de House of Wisdom, pre-rediseño UI.
- **HTML**: ~32.211 líneas, single-file portable.
- **Tests**: ~117 suites, ~3225 verificaciones (TDD obligatorio).
- **Repo**: [Gran-Muro-de-Hierro](https://github.com/Markirov/Gran-Muro-de-Hierro).
- **Demo live**: [markirov.github.io/Gran-Muro-de-Hierro](https://markirov.github.io/Gran-Muro-de-Hierro/) (pendiente rename a `index.html`).
- **Identidad**: companion offline para Trench Crusade — TC construye la banda, Forge la lleva a la mesa.

---

## 2. Documentos de referencia

Documentos que viven aparte y no se duplican aquí. Consultar para el detalle técnico:

- `PIVOT-companion-of-tc-v2.md` — plan estratégico del pivot, Fases 9-15.
- `SPEC-rediseno-ui.md` — especificación del rediseño de UI, Sub-tareas A-I.
- `README.md` — descripción pública del proyecto (raíz del repo).
- `LICENSE` — MIT.
- `.claude/settings.json` — allowlist de permisos para Claude Code.

---

## 3. Próxima acción

**Arrancar Sub-tarea A del SPEC rediseño UI**: layout base de dos columnas con scroll independiente y default model selection. Es el cimiento de las demás sub-tareas. Pasarle el SPEC a Code y ejecutar A → B → C → D → E → F → G → H → I en orden.

Mientras Code trabaja en eso, las tareas de "Alta prioridad" del Backlog (sección 5) se pueden ir resolviendo en paralelo: son independientes y rápidas.

---

## 4. Roadmap por horizontes

### Corto plazo (semanas)

1. **Sub-tareas A-I del SPEC rediseño UI**: layout, sidebar plegable, sub-tabs, botones horizontales, modal wishlist, lista de compra funcional, drag&drop roster, migración de `shoppingList`.
2. **Tareas de alta prioridad** (sección 5): rename a `index.html`, disclaimer fan-made, placeholders WWI, pendientes menores de Code.
3. **Validación en mesa real**: 2-3 partidas con Cazadores y Herejes Infernales con tarjetas y battletrackers físicos. Antes de arrancar el sandbox funcional.

### Medio plazo (1-3 meses)

Ejecutar el resto del **PIVOT v2** (las fases que el SPEC rediseño UI no completa):

- **Fase 9** — UX import desde TC (drag&drop JSON, paste, refresh button).
- **Fase 10** — Desactivar validación oficial estricta (warnings en lugar de bloqueos).
- **Fase 11** — Estructura de datos: `experimentalVariants[]` + `shoppingList[]` con campo `scope` (parcialmente cubierto por Sub-tarea H del SPEC).
- **Fase 12** — Sandbox de variantes funcional (sustituye placeholder "próximamente" de la sub-tab Variantes).
- **Fase 15** — Tour inicial + docs + onboarding.

### Largo plazo (3-12 meses)

- **Lab 2.0: simulación espacial** (idea de mayo 2026): modelo geométrico interno con LoS, alturas, cobertura, combatir a través de ruinas. Sin render 3D visual; representación opcional como Canvas 2D animado tipo replay. Evolución del Lab actual hacia análisis con conciencia espacial. Ver sección 6.
- **Paletas variantes faltantes**: Trench Pilgrims (3), Heretic Legions (3), Black Grail (1), The Court (7).
- **Glossary PDF**, **house rules para partida libre**.

---

## 5. Backlog priorizado

### 🔴 Alta prioridad

- [ ] **Rename `warband-forge.html` → `index.html`** en repo. Resuelve 404 de GitHub Pages.
- [ ] **Disclaimer fan-made en footer del HTML**. Una línea visible o toggle "ⓘ Sobre Warband Forge" con créditos a Factory Fortress Inc.
- [ ] **Poblar `FACTION_PLACEHOLDERS`** con 2-3 imágenes de dominio público (Wikimedia Commons) por facción. Mínimo viable: NA, IS, HL (las facciones de Cazadores y Herejes).
- [ ] **Sub-Fase 12-D pendiente de Code**: wire UI Lab variante vs canon. El motor `runCompare_lab` ya existe; falta la UI que lo invoque desde el sandbox.
- [ ] **Banner Post Game Reporter** en modal de campañas, recomendando TC para tracking oficial de XP/avances.

### 🟡 Media prioridad

- [ ] **Inconsistencia VARIANT_PALETTES vs VARIANT_FACTION_RULES**: faltan paletas para `new-antioch:red-brigade` y `black-grail:great-hunger` (las reglas sí están). O se crean las paletas, o se quitan las reglas.
- [ ] **Validar tarjetas físicas en mesa real**: 2-3 partidas con Cazadores y Herejes para confirmar tamaño, legibilidad, encaje en imprenta.
- [ ] **Ejecutar Fases 9, 10, 11, 12, 15 del PIVOT v2** con Code (después del rediseño UI).
- [ ] **Pestaña "Mis campañas" en nav principal**: pendiente P3 menor según Code (bajo valor, ahorra clics).

### 🟢 Baja prioridad / roadmap futuro

- [ ] **Paletas faccionales pendientes**:
  - [ ] Trench Pilgrims: Sacred Affliction, Saint Methodius, Tenth Plague.
  - [ ] Heretic Legions variantes: Trench Ghosts, Knights of Avarice, Naval Raiding Party.
  - [ ] Black Grail base: Dirge of The Great Hegemon.
  - [ ] The Court: 7 subtipos por pecado (Wrath, Envy, Lust, Pride, Sloth, Gluttony, Greed).
- [ ] **Glossary PDF** imprimible.
- [ ] **House rules para partida libre**: modificaciones que TC no soportaría.
- [ ] **Limpieza del top-bar global**: 15+ botones dispares, posible reorganización en menú "Más" colapsable.
- [ ] **Backup / sync entre dispositivos**: integración opcional con Drive, Dropbox.
- [ ] **Soporte touch para drag&drop** (solo si Marcos empieza a usar mobile habitualmente).

---

## 6. Ideas pendientes de evaluar

### 💡 Lab 2.0: simulación espacial

**Idea**: pasar el Lab actual (simulador abstracto sin geometría) a un simulador con conciencia espacial. No render 3D visual, no wargame digital. Solo modelo geométrico interno + reglas que respetan LoS, alturas, cobertura, modificadores por combatir a través de ruinas.

**Visualización opcional**: Canvas 2D animado tipo replay (snapshots por turno con flechitas de movimiento e indicadores de disparo). Estilo XCOM ASCII, no Tabletop Simulator.

**Versión inicial sugerida**:

1. Mapas como JSON: grid con altura por celda + lista de obstáculos. 2-3 mapas predefinidos (Open Ground, Ruined Village, Trenchworks).
2. Despliegue manual del jugador; banda enemiga con autodespliegue heurístico.
3. Reglas espaciales: LoS, range, cover (light/heavy), elevation modifier, charge range, combate a través de ruinas.
4. IA enemiga simple (heurística "acercarse al más amenazante, disparar al mejor target"). Sin minimax.
5. Salida igual que Lab actual (% victoria, KO esperados) + opción de replay 2D animado para batalla concreta.

**Encaje en la identidad**: no es wargame digital reemplazando la mesa. Es simulador de análisis con conciencia espacial. Simular 1000 batallas con LoS para ver patrones estadísticos imposibles de probar a mano. Sigue siendo Lab, sigue siendo análisis, ahora con coordenadas.

**Estimación**: 3-6 sprints de Code, ~2-4 meses concentrados.

**Timing**: post-PIVOT v2. Después de cerrar rediseño UI y sandbox funcional. Antes de validar en mesa real con tarjetas físicas, no.

**Decisiones pendientes** (cuando se formalice como SPEC):

- Granularidad: grid de 1" o coordenadas libres.
- Mapas V1: cuáles y cuántos.
- Reglas V1: qué subconjunto de Trench Crusade implementar.
- Replay animado: V1 o V2.

---

## 7. Hecho recientemente

- [x] **Diagnóstico del estado del HTML** tras integración de tarjetas/battletrackers/placeholders WWI.
- [x] **Fix de House of Wisdom**: mismatch de variantId en `VARIANT_PALETTES`.
- [x] **PIVOT v2 redactado** (`PIVOT-companion-of-tc-v2.md`): plan estratégico con sandbox de variantes + lista de la compra incorporados.
- [x] **SPEC del rediseño UI** redactado (`SPEC-rediseno-ui.md`): 10 decisiones de diseño cerradas + drag&drop como Sub-tarea I.
- [x] **README.md** del repo creado.
- [x] **LICENSE** MIT creada.
- [x] **`.claude/settings.json`** generado: allowlist sensata para que Code trabaje sin pedir permiso constante.
- [x] **Idea Lab 2.0 espacial** capturada para evaluación post-pivot.

---

## 8. Notas de proceso

- **TDD obligatorio**: tests verdes antes de cada commit. Sin excepciones.
- **UI en español**, canon Trench Crusade estricto.
- **Single-file HTML**: no introducir librerías nuevas; jsPDF ya está cargada.
- **No romper tests existentes** en cada fase.
- **Permisos de Code**: `.claude/settings.json` auto-aprueba Read/Write/Edit/git/exploración/python http server. El resto pide confirmación. Editar cuando aparezcan necesidades nuevas.
- **Cazadores del Muro** (warband-id 299495) y **Herejes Infernales** (warband-id 297322) son los fixtures canónicos de integración. Toda funcionalidad nueva debe pasar tests con esas dos bandas.
- **Filosofía del producto**: Trench Companion construye la banda. Warband Forge la lleva a la mesa.

---

*"For eight centuries the Church has waged its crusade. The armies are at a stalemate."*
