# GOAL: Migración a React - Fase 4 (Modo Mesa / Lab)

## Objetivo
Migrar el motor de simulaciones y el flujo de partida real (Modo Mesa y Laboratorio) hacia Next.js, apoyándose en la gran librería de React.

## Criterios de Éxito

### Fase 4.1 (Ruta Lab y Estado Básico)
- [x] Crear las rutas `/lab` o `/mesa` en Next.js.
- [x] Construir la interfaz de carga de bandas para enfrentarse en el Laboratorio.
- [x] Portar `panel-lab` a componentes de React (controles de simulación, selectores).

### Fase 4.2 (Simulación y Canvas)
- [x] Migrar el estado de `simulateBattle_lab` (y la cadena inmensa de funciones de `loadout_lab.ts`) para alimentar estados de React.
- [x] Migrar el renderizado de la cuadrícula o logs a una visualización moderna en React.
- [x] Comprobar que los tests (que son decenas para el lab) sigan funcionando gracias al export de TS.

### Fase 4.3 (Post-partida y Progresión)
- [x] Implementar la pantalla de fin de partida (Wizard) en React.
- [x] Lógica de asignación de XP, cicatrices y resolución de traumas.
- [x] Almacenar los resultados finales de vuelta en `localStorage`.

## Registro de Intentos
- **Intento 1:** Arrancando.
