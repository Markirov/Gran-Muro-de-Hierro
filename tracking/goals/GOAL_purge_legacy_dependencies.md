# GOAL: Purgar dependencias rotas en motor legacy
**Fecha:** 2026-09-29
**Estado:** [En progreso]

## Objetivo
Revisar todo el código portado (archivos en \pp/lib/\ y \pp/data/\) para detectar variables o funciones globales no importadas que causen \ReferenceError\ en tiempo de ejecución.

## Criterios de éxito
1. La aplicación debe compilar correctamente.
2. Todo rastro de dependencias circulares o globales no importadas debe quedar solucionado.

## Registro de intentos
* Inicio del GOAL.
