# STATE.md — snapshot de estado del proyecto

> Resumen vivo, máximo ~50 líneas. Se reescribe (no se añade) cuando cambia algo (§1.1). La historia completa está en `DONE.md`; el backlog en `PENDING.md`.

**Última actualización:** 2026-10-01, Lead Developer (Antigravity)

## Estado actual
- App Next.js 16 (App Router + Turbopack) desplegada en Firebase Hosting (`https://murodehierrodelsultanato.web.app`).
- **Alineación total con compendios maestros `Tc_Tc_*.md` (SSOT):**
  - Compendios maestros auditados con `validador.py`: 6 archivos, 756 IDs estables, 0 errores en las 7 categorías de validación.
  - Corrección de desvíos en `FACTION_UPGRADES` (`battlekit_deltas.ts` y `.js`): Sniper Rifle (35 👑), Heavy Flamethrower (55 👑), Anti-Tank Hammer (35 👑), Reinforced Armour (40 👑), Trench Mole (10 👑).
  - Bug de sugerencias de la Corte resuelto (`court-serpent` y alias legacy soportados).
  - Arquetipos de relleno en el Lab (`loadout_lab.ts`): Fly Thralls (28 👑) y Yoke Fiend (30 👑) alineados a datos canónicos.
  - Autocannon con `alternateProfiles` estructurado para Full Auto (48", +1 INJURY DICE, AUTOMATIC 5, HEAVY, RELOAD, RISKY).
  - Documentada la Gun Battery (`gun-battery-iw`) en `Tc_Tc_Miniaturas.md`.
  - Diccionario de equivalencias bidireccionales `id_aliases.ts` e `id_aliases.js` (>440 mapeos) y script canónico `verify_tc_alignment.py`.
- Variantes y Sub-facciones canónicas 1.0.2 activas (Fireteams interactivos, Envious Eyes, hechizos gratuitos, límites dinámicos, Abyssinia "Chewa & ELITE only").
- Sincronización en la nube bidireccional (Cloud Firestore) activa: motor `sync_engine.ts` y `.js` con resolución LWW y marcas de borrado (tombstones `warband-forge-deleted`).
- Roster interactivo con 4 Contenedores de Capacidad y tabs temáticos ("Armería"/"Bazar").
- Modo Mesa interactivo con regla TOUGH activa/gastable y desgloses tácticos completos.
- Suite de pruebas completa: **192 suites · 3976 verificaciones · 0 fallos** (`verify.sh`).
- Build limpio: `npm run lint` (0 warnings), `npx tsc --noEmit` (0 errors), `npm run build` exitoso con Turbopack.

## Decisiones vigentes (y por qué)
- **Compendios `Tc_Tc_*.md` como SSOT:** Los compendios en `herramientas/pdfs-reglamento/` mandan sobre cualquier dato en código; `app/data/id_aliases.ts` garantiza la equivalencia transparente entre IDs estables y la app.
- **Zero remote push:** GitHub está congelado; solo commits locales y despliegue a Firebase Hosting (`firebase deploy --only hosting`).
- **Modo Armería vs Bazar:** Armería es exclusivamente lectura de lo equipado; Bazar es el entorno completo de compra y gestión.
- **Scroll estricto en Roster:** El layout `/bandas/roster` no debe usar `min-h-screen` ni padding exterior que supere `100vh`. La tarjeta `ModelDetails` maneja el scroll exclusivamente en su cuerpo de armería (`flex-1 overflow-y-auto`).
- **Paleta Grimdark:** Mantener invariables los colores canónicos (`#0a0503`, `#1a0f0a`, `#2a1610`, `#3a2110`, `#5c3a21`, `#b8863c`, `#e2d4b7`).

## Errores a evitar
- **Scroll dentro de scroll:** Ocurre si `layout.tsx` añade paddings exteriores con `min-h-screen` a la par que `page.tsx` o `ModelDetails.tsx` tienen wrappers anidados con `overflow-y-auto`. Mantener `overflow-hidden` en las raíces y scroll solo en la lista de items.
- **Pérdida de atributos al scrollear equipo:** El header de `ModelDetails` debe tener `shrink-0` fuera del contenedor `overflow-y-auto`.
