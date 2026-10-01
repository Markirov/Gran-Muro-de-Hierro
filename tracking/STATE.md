# STATE.md — snapshot de estado del proyecto

> Resumen vivo, máximo ~50 líneas. Se reescribe (no se añade) cuando cambia algo (§1.1). La historia completa está en `DONE.md`; el backlog en `PENDING.md`.

**Última actualización:** 2026-10-01, Lead Developer (Antigravity)

## Estado actual
- App Next.js 16 (App Router + Turbopack) desplegada en Firebase Hosting (`https://murodehierrodelsultanato.web.app`).
- Variantes y Sub-facciones canónicas 1.0.2 implementadas y verificadas:
  - **Fireteams interactivos:** Asignación en `ModelDetails.tsx` (New Antioch: Fireteams 1-2; Prussia: 1-3; Fida'i: Killing Squad; Red Brigade: Dog Fireteam), badges en `RosterList.tsx` y activación conjunta con navegación de miembros en `TabletopMode.tsx` (`effectiveKeywords` integra `FIRETEAM`).
  - **Envious Eyes (Sin of Envy):** Acceso en el Bazar a armerías de New Antioch, Trench Pilgrims, Iron Sultanate, Heretic Legions y Black Grail con badges identificativos `[Envious Eyes: Facción]`.
  - **Hechizos gratuitos:** *Sorcerer* con `Blessing of the Serpent Moon ACTION` y *Hell Knights* con `Blood Magic` en habilidades fijas de `01_trench_crusade_game_data.ts` y `02_ability_library.ts`.
  - **Límites dinámicos de banda:** Artillery Witch Battery (0-1 base, 0-2 si valor $\ge 1.000$ 👑; tope de 1 en Naval Raiders); Cradle Thralls exentos de Maximum Field Strength (`exemptFromFieldStrength: true`).
  - **Gun Battery estacionaria:** `gun-battery-iw` (Grand Cannon emplazado, 60 👑, Troops, IMMOBILE, ARTIFICIAL) con límite cruzado 0-2 Grand Cannons entre Brazen Bulls y Gun Batteries.
  - **Abyssinia ("Chewa & ELITE only"):** Unión canónica para Shotel y Anfarro (equipables por cualquier ELITE sin Chewa, y por Shock Troopers con Chewa).
- Sincronización en la nube bidireccional (Cloud Firestore) activa: motor `sync_engine.ts` y `.js` con resolución LWW y marcas de borrado (tombstones `warband-forge-deleted`) para evitar resurrección entre múltiples dispositivos (`test_next_firebase_sync.js` 32 ✓).
- Roster interactivo con 4 Contenedores de Capacidad (Melee, Ranged, Armour/Shield, Gear/Grenades) y tabs temáticos ("Armería"/"Bazar").
- Modo Mesa interactivo con regla TOUGH activa/gastable, desgloses tácticos de armas, armaduras, defensas activas y herramientas.
- Suite de pruebas completa: 191 suites · 3971 verificaciones · 0 fallos (`verify.sh`).
- Build limpio: `npm run lint` (0 warnings), `npx tsc --noEmit` (0 errors), `npm run build` exitoso con Turbopack.

## Decisiones vigentes (y por qué)
- **Zero remote push:** GitHub está congelado; solo commits locales y despliegue a Firebase Hosting (`firebase deploy --only hosting`).
- **Modo Armería vs Bazar:** Armería es exclusivamente lectura de lo equipado; Bazar es el entorno completo de compra y gestión.
- **Scroll estricto en Roster:** El layout `/bandas/roster` no debe usar `min-h-screen` ni padding exterior que supere `100vh`. La tarjeta `ModelDetails` maneja el scroll exclusivamente en su cuerpo de armería (`flex-1 overflow-y-auto`).
- **Paleta Grimdark:** Mantener invariables los colores canónicos (`#0a0503`, `#1a0f0a`, `#2a1610`, `#3a2110`, `#5c3a21`, `#b8863c`, `#e2d4b7`).

## Errores a evitar
- **Scroll dentro de scroll:** Ocurre si `layout.tsx` añade paddings exteriores con `min-h-screen` a la par que `page.tsx` o `ModelDetails.tsx` tienen wrappers anidados con `overflow-y-auto`. Mantener `overflow-hidden` en las raíces y scroll solo en la lista de items.
- **Pérdida de atributos al scrollear equipo:** El header de `ModelDetails` debe tener `shrink-0` fuera del contenedor `overflow-y-auto`.
