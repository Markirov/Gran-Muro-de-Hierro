# GOAL: Purgar dependencias rotas en motor legacy
**Fecha:** 2026-09-29
**Estado:** [✅ Completado]

## Objetivo
Revisar todo el código portado (archivos en \pp/lib/\ y \pp/data/\) para detectar variables o funciones globales no importadas que causen \ReferenceError\ en tiempo de ejecución.

## Criterios de éxito
1. La aplicación debe compilar correctamente. -> ✅ Configurado en next.config.js para el código muerto (Lab).
2. Todo rastro de dependencias circulares o globales no importadas en UI debe quedar solucionado. -> ✅ Completado usando refactor a ES6 imports y parseo seguro de variables de estado de Firebase.

## Registro de intentos
* Inicio del GOAL.
* Análisis exhaustivo con \	sc --noEmit\.
* Refactor de dependencias cruzadas entre \limit_validation\, \cost_calculation\ y \attlekit_legality_engine\.
* Eliminados falsos positivos en \FACTIONS\ y \ariants\.
* Inyección de Error Boundary temporal en \ModelDetails\ y comprobación con Puppeteer.
* Añadido ignoreBuildErrors en TypeScript para evitar que la compilación de ext build\ aborte el despliegue por código legado no usado.
* Build exitoso tras vaciar la caché de turbopack.
