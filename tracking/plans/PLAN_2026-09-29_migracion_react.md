# Plan de Migración a React (Next.js)

## Objetivo
Migrar la parte de gestión de bandas y el modo mesa (Lab/Battle) desde Vanilla JS (DOM manual) a componentes de estado de React, manteniendo la integridad del proyecto y pasando los tests TDD.

## Motivación
El usuario ha solicitado migrar "toda la parte de bandas y el modo mesa". Dado que esto abarca más del 60% de la lógica de la aplicación (~25,000 líneas), realizarlo en un solo paso rompería la estabilidad del proyecto. Se requiere un enfoque iterativo.

## Estrategia de Coexistencia
Mientras migramos, la aplicación original seguirá viviendo en `public/app.html`. Las nuevas rutas en Next.js (e.g. `/bandas`, `/lab`) irán reemplazando la funcionalidad paulatinamente. Se construirá una capa de compatibilidad para leer y escribir en el mismo formato de `localStorage` que usa Vanilla JS (`wf.warbands`, `wf.ui.bandaSubtab`, etc.) para que ambos sistemas puedan coexistir.

## Tareas (checklist de implementación)

### Fase 1: Enrutamiento y Lista de Bandas
- [ ] Configurar Layout principal de la app en React (Sidebar / Navegación).
- [ ] Crear la ruta `/bandas` (`app/bandas/page.tsx`).
- [ ] Migrar el listado de bandas guardadas (`panel-bands-list`) leyendo de `localStorage`.
- [ ] Conectar los botones de importar, exportar y "Crear nueva banda".

### Fase 2: Creación y Catálogo de Facción
- [ ] Migrar `panel-faction-catalogue` a un componente de React.
- [ ] Extraer la lógica de inicialización de bandas desde `01_trench_crusade_game_data.js` a un hook de React o utilidad compartida.
- [ ] Crear el flujo para instanciar una banda vacía y redirigir al Roster.

### Fase 3: Roster y Detalles (El Núcleo)
- [ ] Migrar `panel-roster` (listado de unidades, pool, adds).
- [ ] Migrar `panel-detail` (información de unidad, reglas especiales, equipamiento).
- [ ] Migrar `panel-variantes` y `panel-shopping`.
- [ ] Adaptar o reescribir los tests JSDOM que tocan esta área para que rendericen los componentes React (usando `@testing-library/react` si procede).

### Fase 4: Modo Mesa / Lab
- [ ] Crear la ruta `/lab`.
- [ ] Migrar el Canvas de simulación y la lógica de estado de `panel-lab` y `panel-battle`.
- [ ] Migrar el reporte post-batalla y ganancia de XP.

## Criterios de Aceptación
- CUANDO el usuario navega a `/bandas` ENTONCES ve sus bandas guardadas en el mismo formato que en la app antigua.
- CUANDO se migre un módulo ENTONCES sus tests correspondientes deben ser adaptados y pasar exitosamente.
