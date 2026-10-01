# Plan de Implementación: Generador Automatizado `Tc_Tc_*.md` → `app/data/*.ts`

> **Fecha:** 2026-10-01  
> **Rol:** Lead Developer / Arquitecto  
> **Propósito:** Convertir los compendios maestros `Tc_Tc_*.md` en la Fuente Única de Verdad (SSOT) activa y ejecutable, mediante un script sincronizador y generador que extraiga armas, armaduras, equipo, miniaturas, habilidades y keywords directamente desde el markdown y mantenga sincronizado `app/data/*.ts` y `public/js/`.

---

## 1. Contexto y Objetivos

Actualmente los 6 compendios `Tc_Tc_*.md` cuentan con 756 IDs estables y pasan el validador canónico con 0 fallos. Sin embargo, el código de la aplicación en `app/data/*.ts` se mantenía manualmente en paralelo.
El objetivo de este plan es:
1. Crear un parser robusto de las tablas y secciones de los 6 compendios `Tc_Tc_*.md`.
2. Crear el script sincronizador `scripts/sync_from_tc_master.py` (con modo `--check` para CI/validación y modo `--write` para aplicar cambios).
3. Conectar la sincronización con `scripts/build-legacy-data.js` para que cualquier actualización de los `.md` se propague a TypeScript y a Vanilla JS automáticamente.
4. Integrar el chequeo en `verify.sh` para que ningún commit pueda introducir deriva entre los `.md` y el código.

---

## 2. Arquitectura del Generador

### 2.1 Módulos a parsear desde los Markdown maestros
- **`Tc_Tc_Armas.md`:** Parsea filas de armas (Nombre, ID estable, Facción, Manos/Tipo, Rango, Modificadores, Keywords, Coste, Restricciones).
- **`Tc_Tc_Armaduras_Y_Escudos.md`:** Parsea filas de armaduras y escudos (Nombre, ID estable, Facción, Tipo, Modificadores/Efectos, Coste, Restricciones).
- **`Tc_Tc_Equipo_Y_Municion.md`:** Parsea equipo y munición especial (Nombre, ID estable, Facción, Categoría, Efectos, Coste, Restricciones).
- **`Tc_Tc_Miniaturas.md`:** Parsea cabeceras `###`, metadata de facción, categoría, coste base, peana, atributos de tabla (Move, Melee, Ranged, Armour), keywords base y habilidades innatas.
- **`Tc_Tc_Keywords.md`:** Glosario y reglas de keywords.
- **`Tc_Tc_Reglas_Y_Habilidades.md`:** Definiciones de habilidades y acciones.

### 2.2 Diccionario de equivalencias (`id_aliases.ts`)
El generador utiliza `APP_TO_STABLE_ID_MAP` y `STABLE_TO_APP_ID_MAP` para mapear los items existentes en `app/data/01_trench_crusade_game_data.ts` con sus filas correspondientes en los compendios maestros, identificando con precisión cualquier desvío en coste, atributos, modificadores o keywords.

### 2.3 Modos de Operación
* **`--check`**: No modifica archivos. Compara el 100% de los elementos de `Tc_Tc_*.md` contra `app/data/*.ts`. Si detecta diferencias en costes, nombres, keywords o estadísticas, emite un reporte detallado y sale con código 1.
* **`--write`**: Aplica las correcciones y actualizaciones de datos automáticamente a `app/data/01_trench_crusade_game_data.ts`, regenera los alias y ejecuta `build-legacy-data.js`.

---

## ## Tareas (checklist de implementación)

### Fase 1: Parser de Compendios Maestros
- [x] Implementar funciones de extracción en `scripts/sync_from_tc_master.py`:
  - [x] `parse_weapons(path)`
  - [x] `parse_armours(path)`
  - [x] `parse_equipment(path)`
  - [x] `parse_units(path)`
- [x] Validar que el parser extraiga el 100% de los 756 IDs registrados por `validador.py`.

### Fase 2: Motor de Comparación y Sincronización
- [x] Implementar el comparador de armas, armaduras y equipo contra `app/data/01_trench_crusade_game_data.ts`.
- [x] Implementar el comparador de perfiles de miniaturas (costes base, movimiento, atributos, peanas, keywords).
- [x] Implementar la actualización atómica en `app/data/01_trench_crusade_game_data.ts` para modo `--write`.

### Fase 3: Integración en el Pipeline y Automatización
- [x] Conectar la ejecución con `scripts/build-legacy-data.js` para reflejar cambios en `public/js/`.
- [x] Conectar la regeneración de `id_aliases.ts` e `id_aliases.js`.
- [x] Integrar el modo `--check` en `scripts/verify_tc_alignment.py`.

### Fase 4: Pruebas y Verificación
- [x] Test unitario en `tests/test_tc_md_alignment.js` verificando que el sincronizador funcione en `--check` con 0 desvíos.
- [x] Ejecutar `verify.sh` y certificar que la suite completa sigue 100% en verde.
- [x] Build limpio (`npm run lint`, `npx tsc --noEmit`, `npm run build`).
