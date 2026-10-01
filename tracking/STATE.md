# STATE.md — snapshot de estado del proyecto

> Resumen vivo, máximo ~50 líneas. Se reescribe (no se añade) cuando cambia algo (§1.1). La historia completa está en `DONE.md`; el backlog en `PENDING.md`.

**Última actualización:** 2026-10-01, Lead Developer (Antigravity)

## Estado actual
- App Next.js 16 (App Router + Turbopack) desplegada en Firebase Hosting (`https://murodehierrodelsultanato.web.app`).
- Armaduras, Escudos y Rasgos Defensivos canónicos en Roster y Modo Mesa: módulo `weapon_helpers.ts` y `.js` con `extractArmourDefenses`, `getBulkyInfo` (peanas 40mm/50mm, Carga D3", soporte Celtic Alba con Carga D6"), `getModelArmourBreakdown` (desglose innata + corporal + escudo), `getModelDefensiveImmunities` (detección transversal de `NEGATE FIRE/GAS/SHRAPNEL/FEAR`, `IMPERVIOUS`, `STANDFAST`), selectores del Bazar con chips de herida (`ARM -X`) y badges tácticos, y Modo Mesa con cintillo de Defensas activas, banner de BULKY y test `test_armour_features.js` (37 ✓).
- Armas en Roster y Modo Mesa enriquecidas y canónicas: módulo `weapon_helpers.ts` con saneamiento de alcance (sin dobles comillas `24""`), manos unificadas (`1H`, `2H`, `Pistol`, `Granada`, `1H (STRONG)`), desglose de modificadores de combate (`Atq +1 DICE`, `Daño +1 INJURY`), detección de munición especial en tirador e impacto visual en armas aplicables, aviso canónico de `RELOAD` ("atacar concluye la activación"), vista previa táctica en selectores del Bazar y test dedicado `test_weapon_features.js` (23 ✓).
- Fuente Única de Verdad (`/referencia`) establecida al 100%: `REGLAS_Y_HABILIDADES.md` (79.3 KB, mecánicas, habilidades, reglas de facción y doctrinas de variantes), `MINIATURAS.md` (76.6 KB, catálogo exhaustivo de perfiles, atributos, costes y Battlekit), `KEYWORDS.md` (36.4 KB, glosario oficial 1.0.2 con erratas), `ARMAS.md` (21.2 KB, perfiles de daño, alcance, manos y keywords), `ARMADURAS_Y_ESCUDOS.md` (5.7 KB, modificadores reales y reglas) y `EQUIPO_Y_MUNICION.md` (15.9 KB, municiones y herramientas canónicas).
- Importación y exportación bidireccional Trench Companion blindada y activa: inferencia multi-fuente de facciones (keywords, IDs de modelo, variantes, heurística) con 100% de cobertura; sanitización estricta contra valores `undefined` para evitar excepciones en Firebase Firestore; resiliencia ante miniaturas no canónicas en `RosterList` y `ModelDetails` con fallback temático descriptivo.
- Integración UI en Mis Bandas (`/bandas`, drag&drop `.json`, modal de importación y botón de exportar por tarjeta), Crear Banda (`/bandas/crear`, banner de importación directa) y Roster (`/bandas/roster`, botones Companion y Refrescar con modales interactivos).
- Equipamiento permanente/innato integrado transversalmente: todas las bandas y mercenarios integran su armadura y armas innatas en los 4 Contenedores de Capacidad de Roster (`ModelDetails.tsx`), bloqueando compras duplicadas de armadura/casco y mostrando badges `Innata`/`Innato` no removibles.
- Anchorite Shrine dinámico: Catherine Wheel + Bonebreaker Mace integradas en Melee (2 manos); al equipar un arma a distancia Anchorite se sustituye automáticamente la Catherine Wheel pasando a 1 mano Melee + 1 Ranged.
- Kingdom of Alba Assault Detachment canon: MHI con selección de armadura (Reinforced 85 👑 o Machine Armour 95 👑); descuento del 50% de Cold Steel en selectores, equipamiento y cálculo de costes; exención de penalización de movimiento Down en Modo Mesa (`Sin penaliz. Down`).
- Modo Mesa interactivo con regla TOUGH: modelos con TOUGH muestran el símbolo de su facción en el botón "Fuera"; al pulsar por primera vez se devuelve a "En Pie", gasta el símbolo, notifica con modal explicativo y sombrea la habilidad TOUGH con (gastado) en la lista de Habilidades.
- Roster interactivo con 4 Contenedores de Capacidad (Melee, Ranged, Armour/Shield, Gear/Grenades) y tabs temáticos ("Armería"/"Bazar", etc.).
- Modo Armería estricto de solo lectura: oculta desequipado y selectores; oculta secciones y sub-bloques vacíos; tooltips de reglas e inspección visual en hover para habilidades innatas, keywords de modelo y armas.
- Presupuesto libre y desequipado restrictivo: saldo editable; si es negativo se resalta en rojo y solo permite desequipar ítems, desactivar mejoras o despedir miniaturas.
- Tooling saneado para Next 16: ESLint usa CLI actual con `max-warnings=0`, `tsc --noEmit` limpio, Turbopack optimizado y 186 suites de tests automatizados sin fallos.
- Workspace de Roster fijado a pantalla completa sin scrolls anidados (`h-screen overflow-hidden`) y cabecera de atributos anclada.

## Decisiones vigentes (y por qué)
- **Zero remote push:** GitHub está congelado; solo commits locales y despliegue a Firebase Hosting (`firebase deploy --only hosting`).
- **Modo Armería vs Bazar:** Armería es exclusivamente lectura de lo equipado (sin permitir añadir ni quitar equipo, filtrando cualquier categoría vacía); Bazar es el entorno completo de compra y gestión.
- **Scroll estricto en Roster:** El layout `/bandas/roster` no debe usar `min-h-screen` ni padding exterior que supere `100vh`. La tarjeta `ModelDetails` maneja el scroll exclusivamente en su cuerpo de armería (`flex-1 overflow-y-auto`).
- **Paleta Grimdark:** Mantener invariables los colores canónicos (`#0a0503`, `#1a0f0a`, `#2a1610`, `#3a2110`, `#5c3a21`, `#b8863c`, `#e2d4b7`).

## Errores a evitar
- **Scroll dentro de scroll:** Ocurre si `layout.tsx` añade paddings exteriores con `min-h-screen` a la par que `page.tsx` o `ModelDetails.tsx` tienen wrappers anidados con `overflow-y-auto`. Mantener `overflow-hidden` en las raíces y scroll solo en la lista de items.
- **Pérdida de atributos al scrollear equipo:** El header de `ModelDetails` debe tener `shrink-0` fuera del contenedor `overflow-y-auto`.
