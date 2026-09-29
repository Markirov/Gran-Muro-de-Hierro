# GOAL: Migración a React - Fase 3 (Roster, Detalles y Tienda)

## Objetivo
Migrar la lógica completa de edición de bandas (Roster, Detalles de Unidad, Tienda y Variantes) a componentes de React, apoyándose en un modelo de datos compartido entre Next.js y el simulador de Vanilla JS.

## Criterios de Éxito

### Fase 3.1 (Datos compartidos y Vista)
- [x] Extraer `DATA`, `ABILITY_LIBRARY`, `KEYWORD_LIBRARY`, `WEAPON_KEYWORD_LIBRARY`, `FACTION_SPECIAL_RULES_LIBRARY`, `GENERAL_TERMS_LIBRARY` y `STIPULATION_LIBRARY` a módulos TypeScript en `app/data/`.
- [x] Generar un script o bundle (`build-legacy-data.js`) que inyecte estos datos en la app antigua (`app.html`) y los tests JSDOM.
- [x] Crear la ruta `/bandas/roster` en Next.js.
- [x] El componente carga la banda seleccionada y muestra el Header (Nombre, Facción, Presupuesto, Gloria).
- [x] El componente lista las miniaturas actuales de la banda (Roster List).

### Fase 3.2 (Edición y Lógica de Negocio)
- [x] Portar el motor de cálculo de costes y validación de legalidad (`cost_calculation.js` y `limit_validation.js`) a utilidades TS utilizables en React.
- [x] Implementar el Catálogo de Unidades (Tienda) en React para reclutar.
- [x] Implementar la funcionalidad de añadir y eliminar modelos.
- [x] Implementar la Vista de Detalles de Unidad (`panel-detail`) en React (estadísticas, equipo, reglas).
- [x] Implementar la Armería para comprar equipamiento.
- [x] Lograr que los 80+ tests TDD sigan pasando (mediante el bundle).

## Registro de Intentos
- **Intento 1:** Fase 3.1 y gran parte de la 3.2 completadas con éxito y 0 roturas usando `scripts/build-legacy-data.js`.
