# Warband Forge — Backlog

Estado tras la sesión 2026-05-11/12. CLAUDE.md roadmap Fases 3-10 cerradas, P0/P1/P2 cerradas. Repo en GitHub. Lo que queda son refinamientos opcionales de simulación.

## P0 — Cerrado ✓

Respaldo en GitHub: `Markirov/Gran-Muro-de-Hierro` (privado). Push completado.

Pendiente opcional: Netlify o GitHub Pages para deploy automático del HTML estático cuando se quiera compartir build online.

## P2 — Cerrado completamente

Todos los hooks del activation loop han sido enchufados:

- ✓ `applySkipActivation` consumido en activateModel_lab (commit d809772).
- ✓ Sorcerer cast cycle wired en activateModel_lab (commit 1fe3dce).
- ✓ Eye of Beelzebub trigger wired en activateModel_lab (commit 975a8b9).

Orden canónico de prioridad en la activación: skipActivation → Eye fire → Sorcerer cast → activation normal. Cada hook tiene return inmediato post-efecto para evitar doble-acción.

## Todos los refinamientos cerrados ✓

- ✓ Animación dados (commit cf9e5ab)
- ✓ Goetic effect kinds expandidos (commit 869539c): self-heal-blood, grant-cover, ranged-attack, area-blast, summon-wretched, revive-friend. Antes solo curse-armour + skip-activation.
- ✓ Concentrated Attack — 4 modes (uniform / positional / clustered / real). El último (commit 7df4d6d) usa positions reales 48"x32" canon con proximity 2" exacto.
- ✓ Heurística cast smarter (commit 869539c): Sorcerer prioriza ELITE de mayor coste como target en lugar de random.

## Realmente nada pendiente

Roadmap CLAUDE.md completado. Todos los BACKLOG ítems (P0/P1/P2 + opcionales) cerrados.

Cualquier trabajo adicional sería:
- Content canon nuevo (futuras expansiones del juego).
- Consumo de _pos en más fases del simulador (range checks en attacks, movement entre fases, charges con LoS). Los helpers están expuestos; falta wiring en resolveRanged_lab / melee si se quiere precisión completa.

## P3 — Tooling

### "Mis campañas" pestaña dedicada en nav principal

Fase 7.3 de CLAUDE.md. El modo "campana" actual ya cubre el caso, pero un atajo directo desde el nav reduciría clics. Bajo valor.

## Cerrado en esta sesión

| # | Commit | Item |
|---|---|---|
| 1 | df3efbc | baseline + .gitignore |
| 2 | c9e3ab8 | Fase 3 wizard partida libre |
| 3 | 0ac3ef4 | Fase 4.1 skeleton + contexto + skip |
| 4 | e08c967 | Fase 4.2 steps canon |
| 5 | bfd499e | Fase 4.3 trauma auto-skip |
| 6 | 2553cb7 | Fase 4.4 promotions/xp helpers |
| 7 | 265bd3e | Fase 4.5 exploration wired |
| 8 | 661af86 | Fase 4.6 QM step |
| 9 | bd8f312 | Fase 4.7 resumen + save free |
| 10 | 8a34256 | Fase 5.1 option picker |
| 11 | 4486e0b | Fase 5.2 re-rolls |
| 12 | f8c4fa8 | Fase 5.3 effects auto-apply + pending |
| 13 | 9827cfc | Fase 6.1 shopping list modelo |
| 14 | 560b255 | Fase 6.2 toggle detail |
| 15 | 4bff005 | Fase 6.3 QM tab buy |
| 16 | 12d59a5 | Fase 6.5 toast post-batalla |
| 17 | 4245b6e | Fase 10 BACKLOG.md inicial |
| 18 | ce79c13 | Fase 5.5 grant-xp-to-elites |
| 19 | a6b37a6 | Fase 5.6 Arsenal + add-named-battlekit |
| 20 | 075813c | Fase 5.7 morale-bonus decay |
| 21 | a720b0b | Fase 6.4 DnD reorder |
| 22 | 6fd6151 | BACKLOG actualizado |
| 23 | d18ac0c | P1/2 cannotGainXp Head Wound |
| 24 | c73b8ca | P1/3 wb.strongbox |
| 25 | 32d1881 | P2/6 Arsenal UI |
| 26 | 169b1f6 | P2/7 tempBonuses UI |
| 27 | 6450c19 | Fase 8 borrado→libres |
| 28 | 3640ccd | Fase 9 filtros Patron/Glory |
| 29 | 3104a61 | Fase 7.1 historial helper |
| 30 | 0ff6873 | Fase 7.2 historial tab QM |
| 31 | c608f9b | BACKLOG cierre P1/P2 |
| 32 | ea894a7 | P1 open QM en libre + filterUnits apply |
| 33 | 8a79b95 | P2/7 retro-fill strongbox |
| 34 | 754f73f | Fase 7.4 botón Campañas por banda |
| 35 | e445980 | P2/4 choose-battlekit resolver |
| 36 | bf40f1f | P2/8 Companion shopping toggle |
| 37 | 2a8b77d | BACKLOG cierre tras P1/P2 |
| 38 | 59be92e | T1 Trauma D66 migration completa |
| 39 | 9c2ef1d | T2/T3 Concentrated Attack + Fireteams data + helper |
| 40 | 5a78075 | T4 escenarios V/VI/IX (Armoured Train / Dragon Hunt / Fields of Glory) |
| 41 | 9a0295a | BACKLOG cierre T1-T4 |
| 42 | cf9e5ab | Animación dados Exploration (P1 cosmético cierre) |
| 43 | 2e2dded | BACKLOG cierre P1 |
| 44 | (push a GitHub `Markirov/Gran-Muro-de-Hierro` — P0 cerrado) |
| 45 | 7b409db | P2 reglas no modeladas: Goetic Spells + Eye of Beelzebub + Fortify ACTION |
| 46 | acc6e09 | Invariante variantes canon + Great Hunger enriquecido |
| 47 | cde18cb | Concentrated Attack integrado en motor Lab simulator |
| 48 | 5dc4d8f | BACKLOG cierre P0/P1/P2 |
| 49 | f1de0df | Sub-fases A-G: variantes + reglas + CA positional (flags listos) |
| 50 | 2124ba8 | Wire flags en resolveRanged_lab + applyInjury_lab (Lust/Pride/Sloth/Gluttony/Fortify/Hunger) |
| 51 | 51d3610 | opt mode='positional' para CA en simulateBattle_lab |
| 52 | 350d3a7 | BACKLOG cierre wire-up |
| 53 | d809772 | Wire applySkipActivation en activateModel_lab |
| 54 | 1fe3dce | Wire Sorcerer cast cycle en activateModel_lab |
| 55 | 975a8b9 | Wire Eye of Beelzebub trigger en activateModel_lab |
| 56 | 7dec250 | BACKLOG cierre activation hooks |
| 57 | 869539c | Goetic effect kinds expandidos + heurística cast smarter |
| 58 | bc4e6f3 | Opt 2 CA clustered (3er mode tras uniform/positional) |
| 59 | d1c1737 | BACKLOG cierre refinamientos opcionales |
| 60 | 7df4d6d | Positions reales en Lab + CA canon-exact (4to mode 'real') |

## Notas de proceso

- Tests viven en raíz como `test_*.js`. Runner: `for t in test_*.js; do node $t; done`.
- Patrón module-style con `bootIdx` cut. Mira un test reciente (ej. `test_wizard_summary_save.js`) como referencia.
- Cada subfase: red test → impl → run all suites → jsdom parse → commit con cuerpo explicativo (qué + por qué + out of scope).
- Caveman mode opcional para chat técnico, pero código/commits/docs en prosa normal.
