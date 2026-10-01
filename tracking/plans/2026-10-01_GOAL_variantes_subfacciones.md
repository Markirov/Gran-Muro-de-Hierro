# GOAL: Variantes y Sub-facciones — Reglas y Particularidades Canónicas

> Memoria de ejecución y seguimiento para las particularidades pendientes de variantes y sub-facciones según Rulebook 1.0.2 y Warbands 1.0.2.
> **Estado:** Completado el 2026-10-01.

---

## 🎯 Criterios de Éxito Medibles

1. **Fireteams canónicos:**
   - **New Antioch:** 0-2 Fireteams por banda; cada Fireteam formado por 2 a 3 miniaturas elegidas entre *Trench Yeoman*, *Combat Medic* y *Sniper Priest*.
   - **Trench Ghosts (Prussia):** 0-3 Fireteams por banda; 2 a 3 miniaturas por Fireteam.
   - **Killing Squad (Fida'i / Sultanate):** Grupo de 2 a 3 Fida'i asignados a un Fireteam de asesinato coordinado.
   - **Red Brigade (Heretic Legion):** Fireteam canónico de Trench Dogs con su Handler.
   - Validación visual y funcional en Roster y Modo Mesa (asignación en `ModelDetails.tsx`, tags en `RosterList.tsx`, activación conjunta y navegación de escuadra en `TabletopMode.tsx`).
   - Estado: ✅ Implementado y verificado.

2. **Envious Eyes (Pecado de Envidia / Heretic Legion):**
   - CUANDO la banda tiene la doctrina/variante Envy ENTONCES el Bazar permite adquirir armas y equipo de las armerías de otras facciones.
   - Estado: ✅ Implementado en `sin-envy` (`foreignArmoury`), `ModelDetails.tsx` y test `test_subfactions_and_variants_features.js`.

3. **Hechizos Gratuitos en Reclutamiento:**
   - CUANDO se recluta un *Hell Knight* (The Court) ENTONCES recibe sus hechizos de *Blood Magic* sin coste en Ducados.
   - CUANDO se recluta un *Sorcerer* (The Court) ENTONCES recibe su hechizo patronal *Blessing of the Serpent Moon* gratuito.
   - Estado: ✅ Añadidos en `abilities` canónicas de cada miniatura y registrados en `ABILITY_LIBRARY`.

4. **Límites Especiales de Banda:**
   - *Artillery Witch Battery*: Permitido 0-2 únicamente si el valor de la banda es $\ge 1.000$ 👑; bloqueado si es inferior (respetando tope de 1 en Naval Raiders).
   - *Cradle Thralls* (Great Hunger): Exentos del Maximum Field Strength (no suman al cómputo de miniaturas en el límite de banda).
   - Estado: ✅ Implementado y cubierto por tests automáticos.

5. **Iron Wall: Grand Cannon como Gun Battery Estacionaria:**
   - CUANDO una banda de Iron Wall compra armería ENTONCES puede adquirir el *Grand Cannon* como batería estacionaria independiente (`gun-battery-iw`, 60 👑, IMMOBILE, ARTIFICIAL) con un tope combinado de 0-2 Grand Cannons entre Brazen Bulls y Gun Batteries.
   - Estado: ✅ Implementado y verificado en `test_variant_iron_wall_building.js`.

6. **Abyssinia: "Chewa & ELITE only":**
   - CUANDO un modelo ELITE sin Chewa equipa *Shotel* o *Anfarro* ENTONCES es legal (unión canónica).
   - CUANDO un Shock Trooper con Chewa equipa *Shotel* o *Anfarro* ENTONCES es legal.
   - CUANDO un modelo sin ELITE y sin Chewa intenta equiparlos ENTONCES se bloquea.
   - Estado: ✅ Implementado y verificado en `test_variant_abyssinia_building.js`.

7. **Verificación Global:**
   - Tests automatizados dedicados para cada mecánica (`tests/test_subfactions_and_variants_features.js`, `test_variant_abyssinia_building.js`, `test_variant_iron_wall_building.js`).
   - 191 suites · 3971 verificaciones · 0 failures.
   - `npm run lint` y `npm run build` limpios (0 warnings, 0 errors).
   - Estado: ✅ Verificado 100%.
