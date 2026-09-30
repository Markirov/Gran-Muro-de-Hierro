# STATE.md — snapshot de estado del proyecto

> Resumen vivo, máximo ~50 líneas. Se reescribe (no se añade) cuando cambia algo (§1.1). La historia completa está en `DONE.md`; el backlog en `PENDING.md`.

**Última actualización:** 2026-09-30, Lead Developer (Antigravity)

## Estado actual
- App Next.js 16 (App Router + Turbopack) desplegada en Firebase Hosting (`https://murodehierrodelsultanato.web.app`).
- Importación y exportación bidireccional Trench Companion reescritas y activas: importación con inferencia de facción/variantes, mapeo bidireccional de miniaturas, armas conectadas al `battlekit` interno, mejoras y presupuestos; exportación 100% canónica (`trench-companion.com`) con stats formateadas, armas tipadas y round-trip verificado.
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
