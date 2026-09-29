# STATE.md — snapshot de estado del proyecto

> Resumen vivo, máximo ~50 líneas. Se reescribe (no se añade) cuando cambia algo (§1.1). La historia completa está en `DONE.md`; el backlog en `PENDING.md`.

**Última actualización:** 2026-09-30, Lead Developer (Antigravity)

## Estado actual
- App Next.js 16 (App Router + Turbopack) desplegada en Firebase Hosting (`https://murodehierrodelsultanato.web.app`).
- Roster interactivo con 4 Contenedores de Capacidad (Melee, Ranged, Armour/Shield, Gear/Grenades) alineados con canon 1.0.2 y regla STRONG.
- Workspace de Roster fijado a pantalla completa sin scrolls anidados (`h-screen overflow-hidden`), con cabecera de miniaturas y atributos (`MOV`, `RNG`, `MEL`, `ARM`, `BASE`) anclados permanentemente en la parte superior.

## Decisiones vigentes (y por qué)
- **Zero remote push:** GitHub está congelado; solo commits locales y despliegue a Firebase Hosting (`firebase deploy --only hosting`).
- **Scroll estricto en Roster:** El layout `/bandas/roster` no debe usar `min-h-screen` ni padding exterior que supere `100vh`. La tarjeta `ModelDetails` maneja el scroll exclusivamente en su cuerpo de armería (`flex-1 overflow-y-auto`).
- **Paleta Grimdark:** Mantener invariables los colores canónicos (`#0a0503`, `#1a0f0a`, `#2a1610`, `#3a2110`, `#5c3a21`, `#b8863c`, `#e2d4b7`).

## Errores a evitar
- **Scroll dentro de scroll:** Ocurre si `layout.tsx` añade paddings exteriores con `min-h-screen` a la par que `page.tsx` o `ModelDetails.tsx` tienen wrappers anidados con `overflow-y-auto`. Mantener `overflow-hidden` en las raíces y scroll solo en la lista de items.
- **Pérdida de atributos al scrollear equipo:** El header de `ModelDetails` debe tener `shrink-0` fuera del contenedor `overflow-y-auto`.
