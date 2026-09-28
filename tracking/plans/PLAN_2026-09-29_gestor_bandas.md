# PLAN: Remodelación UX del Gestor de Bandas

**Fecha:** 2026-09-29
**Estado:** Propuesta (pendiente de aprobación)

## 1. Contexto y Problema
Actualmente, la aplicación utiliza un paradigma centrado en el documento activo: el modo "⚔ Banda" asume que siempre tienes una banda cargada frente a ti. 
Ver tus bandas requiere abrir un modal secundario ("📜 Cargar"), y crear una banda nueva está disperso entre un botón primario ("Importar de Companion") y un botón secundario oculto ("Nueva Manual"). Esto genera confusión cognitiva y mezcla en la misma barra superior acciones de la biblioteca de bandas con acciones de una banda específica (generar PDFs, editar variantes, modo mesa).

## 2. Propuesta de Arquitectura UX

### A. Pantalla de Inicio Global ("Home" / Landing)
Nueva vista de entrada a la aplicación (el modo por defecto al cargar).
- **Diseño:** Un panel central muy limpio con 4 grandes botones de navegación: **Bandas**, **Campañas**, **LAB**, **Partida**.
- **Cabecera (Header):** Solo mostrará el título de "WARBAND FORGE" y, arriba a la derecha, la rueda de configuración (⚙) con las opciones de cuenta.
- **Navegación:** Al hacer clic en uno de los botones, se entra en ese módulo y se revelan las pestañas superiores para poder saltar entre secciones, junto con un nuevo botón o enlace para volver al Inicio.

### B. Gestión de Bandas ("Mis Bandas")
Al hacer clic en "Bandas" desde el inicio, se entra en la vista de gestión.
- **Visualización:** Una lista o cuadrícula de tarjetas con todas las bandas guardadas en el navegador/Firebase (mostrando Facción, Nombre, 👑 Coste total, Campaña actual).
- **Acciones globales:** Botón principal de "+ Crear Banda". Importar/Exportar backup (JSON).
- **Acciones por banda:** Cargar (Entrar a visualizar), Duplicar, Eliminar.

### C. Creación (Pantalla "Nueva Banda")
Un flujo limpio dedicado exclusivamente a crear una banda, accesible desde "Mis Bandas".
- **Opciones claras:** 
  1. *Desde Trench Companion:* Campo de texto grande para pegar el JSON.
  2. *Forja Manual:* Selector de facciones y reglas de partida para iniciar una banda en blanco.

### D. Visualización / Edición ("Roster Activo")
La vista actual de la banda, a la que se llega tras seleccionarla en "Mis Bandas" o tras crearla.
- **Cabecera contextual:** Nombre de la Banda y un botón de retorno "← Volver a Mis Bandas".
- **Botones de acción:** Solo los referentes a esta banda concreta (Refrescar, Variantes, Lista de Compra, Tarjetas PDF, Modo Mesa). Se elimina el obsoleto "Cargar".

## 3. Impacto en el código (`index.html`)
- **Motor de vistas:** Añadir un nuevo estado `data-mode="home"`. Modificar la lógica de `switchMode()` para que el Home sea el punto de entrada.
- **Navegación:** Añadir un mecanismo (botón Home o título clickeable) para regresar a la vista Home desde los otros módulos.
- **Gestor de bandas:** Sub-dividir el módulo "banda" en tres estados (`bandas-list`, `banda-create`, `banda-roster`).
- **Migración de Modales:** La lógica de `#modal-load` y `#modal-import-companion` pasa a ser parte del flujo DOM integrado (fuera de modales).

## Tareas (checklist de implementación)
1. [x] **Fase 1: Home Global:** Añadir la vista `home` con los 4 botones grandes. Ajustar `boot()` y `switchMode()` para arrancar ahí.
2. [x] **Fase 2: Layout Base Bandas:** Crear los contenedores `#view-bandas-list`, `#view-banda-create` y renombrar el roster actual.
3. [x] **Fase 3: Pantalla "Mis Bandas":** Extraer la lógica de pintado de tarjetas de `#modal-load` al nuevo contenedor listado. Añadir botones Editar, Duplicar, Eliminar.
4. [x] **Fase 4: Pantalla "Crear Banda":** Mover el textarea de Companion y el botón "Nueva Manual" a su propia vista limpia.
5. [x] **Fase 5: Pantalla "Roster":** Limpiar la cabecera actual (`#actions-banda`), añadir el botón "← Volver" y cablear el guardado/carga con la nueva navegación.
6. [ ] **Fase 6:** Testeo y verificación de la regresión completa (`verify.sh`).
