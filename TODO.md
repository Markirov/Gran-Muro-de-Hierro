# Warband Forge — TODO checklist

> Lista priorizada de tareas pendientes y backlog. Para ir tachando.

## 🔴 Alta prioridad

- [x] **GitHub Pages funcional**: renombrar `warband-forge.html` a `index.html` para que cargue en la URL raíz.
- [x] **README.md del repo**: usar el archivo provisto (`README.md`) y subirlo a la raíz del repo. Sustituir contenido actual si lo hay.
- [x] **Disclaimer fan-made en footer del HTML**: una línea visible o un toggle "ⓘ Sobre Warband Forge" que explique el carácter fan-made y dé créditos a Factory Fortress Inc.
- [ ] **Placeholders WWI**: poblar `FACTION_PLACEHOLDERS` con 2-3 imágenes de dominio público de Wikimedia Commons por facción. Mínimo viable: New Antioch, Iron Sultanate, Heretic Legions (las facciones de Cazadores y Herejes, los fixtures de test).

## 🟡 Media prioridad

- [ ] **Inconsistencia palettes/rules**: crear paletas para `new-antioch:red-brigade` y `black-grail:great-hunger`, que tienen reglas en `VARIANT_FACTION_RULES` pero no entradas en `VARIANT_PALETTES`. Alternativa: quitar las reglas si esas variantes no se van a usar.
- [ ] **Validar tarjetas y battletrackers en mesa real**: jugar 2-3 partidas con Cazadores y Herejes con material físico impreso. Confirmar legibilidad, tamaño, diseño antes de seguir construyendo encima.
- [x] **Ejecutar PIVOT v2 con Code**: pasarle `PIVOT-companion-of-tc-v2.md` y empezar por Fase 9 (UX del import desde TC). Orden: 9 → 10 → 11 → 12 → 13 → 14 → 15.
- [x] **Ejecutar SPEC rediseño UI con Code**: cuando se llegue a Fases 12-14 del PIVOT, pasarle `SPEC-rediseno-ui.md`. El rediseño aterriza primero, los sandbox/lista funcionales lo rellenan después.

## 🟢 Baja prioridad / roadmap futuro

- [ ] **Paletas faccionales pendientes**:
  - [ ] Trench Pilgrims (3 variantes: Sacred Affliction, Saint Methodius, Tenth Plague)
  - [ ] Heretic Legions variantes (3: Trench Ghosts, Knights of Avarice, Naval Raiding Party)
  - [ ] Black Grail base completa (Dirge of The Great Hegemon)
  - [ ] The Court (7 subtipos por pecado: Wrath, Envy, Lust, Pride, Sloth, Gluttony, Greed)
- [ ] **Glossary PDF**: idea apuntada en el HANDOFF como interés futuro.
- [ ] **House rules para partida libre**: pequeñas modificaciones a reglas oficiales que TC no soportaría. Aprovecha el "tracking de partida libre" del pivot.
- [ ] **Mejoras del simulador (Lab)**: profundizar el análisis táctico como segunda propuesta de valor diferenciada.
- [ ] **Limpieza del top-bar global**: los 15+ botones (Importar, Cargar, Guardar como, etc.) están dispares. Posible reorganización en menú "Más" colapsable.
- [ ] **Backup / sync entre dispositivos**: el export/import JSON manual ya existe. Posible mejora: integración con Drive, Dropbox, o similares. No urgente.
- [ ] **Soporte mobile / touch para drag&drop**: alternativa con botones arriba/abajo en cada modelo cuando se detecte touch. Solo si empiezas a usar en mobile habitualmente.

## ✅ Hecho en esta sesión

- [x] Diagnóstico del estado tras integración de Code (tarjetas, battletrackers, andamiaje de placeholders)
- [x] Detección y fix del bug de House of Wisdom (variantId mismatch en `VARIANT_PALETTES`)
- [x] Decisión estratégica: pivot v2 con sandbox de variantes + lista de la compra
- [x] PIVOT v2 redactado (`PIVOT-companion-of-tc-v2.md`)
- [x] SPEC del rediseño UI redactado (`SPEC-rediseno-ui.md`) con las 10 decisiones + drag&drop
- [x] Diagnóstico del 404 de GitHub Pages (causa: falta `index.html`)
