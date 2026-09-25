# AGENTS.md — Harness de trabajo (fuente única de protocolo núcleo)

> **Harness v2.5.0** — núcleo sincronizado desde `agentic-framework/`. **Este archivo es 100% núcleo:** no lo edites a mano, se reemplaza entero en `harness update`. Una mejora al núcleo se propone con `harness propose`. Todo lo propio de este proyecto (roles, cabecera Proyecto/Stack, reglas de dominio) vive en **`.agents/PROJECT.md`** — ese archivo nunca lo toca `update`, es tuyo.
>
> **Punto de entrada ÚNICO para cualquier agente (IA o humano) que toque este repositorio.** Léelo entero antes de hacer nada, y después `.agents/PROJECT.md` (quién trabaja aquí) y tu regla dedicada.
> `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` de la raíz son solo punteros a este archivo.

---

## 0 · Arranque de sesión (obligatorio, todos los roles)

> **Skill de referencia:** `.agents/skills/session-onboarding/SKILL.md`.

1. **Bootstrap:** `bash init.sh` — chequeo de git, dependencias, hook de verificación, backlog, y aviso si hay versión nueva del harness.
2. **Asimilación del estado vivo (4 fuentes en `tracking/`):** `DONE.md` (últimas 3-5 entradas), `PENDING.md` (prioridades + locks), `IDEAS.md` (ideas en pausa), `AUDIT.md` (deuda técnica/seguridad activa).
3. **Selección de tarea + lock en PENDING.md:** `[En progreso - <Rol> (<Herramienta>)]`; si editas archivos clave, `(Locks: <archivo>)`. No toques un archivo bloqueado por otra sesión. Al terminar, quita el lock.
4. **GOAL (tareas largas):** si existe `tracking/goals/GOAL_<slug>.md` (§1.5) es tu memoria de trabajo; si creas uno, anótalo como lock.
5. **Lo propio del proyecto:** lee `.agents/PROJECT.md` (roles, reglas de dominio) y después tu regla dedicada.
6. **Reporte ejecutivo (3 puntos):** contexto inmediato (última tarea en DONE), backlog prioritario de tu rol, locks activos.

---

## 1 · Reglas de Oro compartidas (inmutables, todos los roles)

### 1.1 · Registro tras cada cambio + commit (3 pasos, sin excepción)
Al cerrar CUALQUIER tarea, el mismo agente que la ejecutó, en orden:
1. Escribe en `tracking/DONE.md` **al principio** (cronológico inverso). Cabecera `(fecha, Rol (Herramienta), motivo)`.
2. Actualiza `tracking/PENDING.md` — mueve la tarea a `## ✅ Completado` si se cerró (texto íntegro), o déjala anotada. Nunca un `[x]` mezclado entre los `[ ]`.
3. Commit local: `git add . && git commit -m "feat/fix/docs: descripción"`, inmediatamente.

**Prohibido:** `git commit --amend` y `git reset --hard` / `git clean` sin autorización humana explícita.

### 1.2 · Gate de aprobación sobre propuestas de otros roles
Cuando un rol que NO toca código pide un cambio en código o en el harness, el Lead Developer no lo ejecuta directo: presenta la propuesta al usuario y espera aprobación. Lo que cada rol entrega en su propio ámbito (docs, datos, historias) no necesita gate.

### 1.3 · Enrutamiento de esfuerzo (agnóstico de modelo)
Usa el nivel de razonamiento más barato que resuelva la tarea con corrección. Esfuerzo alto solo para diseño, depuración no trivial y arquitectura.

### 1.4 · Planes de implementación + desglose de tareas
- Todo cambio no trivial se diseña en `tracking/plans/PLAN_YYYY-MM-DD_<slug>.md` (inmutable una vez acordado).
- El PLAN cierra con `## Tareas (checklist de implementación)` — numerado por fases, marcado `[x]` al implementar. **Único bloque mutable del PLAN**; la prosa de diseño queda congelada. No confundir con los Criterios de éxito de un GOAL (§1.5): Tareas = pasos; Criterios = aceptación.
- **Criterios de aceptación (opcional, comportamiento verificable):** `CUANDO <disparador> ENTONCES <resultado esperado>`.

### 1.5 · GOAL.md — memoria de ejecución para tareas largas/desatendidas
- `tracking/goals/GOAL_<slug>.md` para tareas de varios pasos o autónomas. Anótalo como lock.
- Estructura: **Criterios de éxito** medibles, **Registro de intentos** con el error literal de cada fallo.
- **Regla de los 3 strikes:** mismo error 3 veces → para y consulta al usuario.
- Al cerrar, archiva a `tracking/plans/YYYY-MM-DD_GOAL_<slug>.md` y quita el lock.

### 1.6 · Delegación entre roles
Un rol que necesita algo de otro lo deja escrito en `PENDING.md` (o en el artefacto de dominio), no confía en el chat como memoria entre sesiones.

### 1.7 · Propiedad exclusiva del harness
`AGENTS.md`, `PROJECT.md` y todo `.agents/rules/**/*.md` los edita ÚNICAMENTE el Lead Developer. Otro rol que detecte que su regla necesita un ajuste lo redacta como propuesta; el Lead Developer la aplica tras aprobación (§1.2).

### 1.8 · Atomización de reglas por tema
- **Motivo:** que un rol no tenga que releer su regla dedicada completa cuando solo necesita un tema concreto.
- **Formato:** cuando una regla dedicada crece, sus secciones grandes se extraen a `.agents/rules/<rol>/<tema>.md` — agrupado por tema (ej. todo lo de acceso a datos junto), no por sección numerada suelta. La regla del rol queda como **router**: cada sección atomizada se sustituye ahí por un puntero de una línea a su archivo. El agente decide cuándo abrirlo — **no hay mecanismo automático de inyección** (tipo `.cursorrules`/project rules); si un proyecto necesita eso, es investigación/capacidad propia suya, no algo que el núcleo garantice hoy.
- **Qué se atomiza:** decisión del Lead Developer, caso por caso, no automática. Roles con identidad narrativa/creativa que casi siempre necesitan su contexto completo de una sola vez (rara vez se benefician de atomizar). Roles con mucho contenido procedimental o de referencia (checklists, mapas de archivos, reglas técnicas por área) son los candidatos naturales cuando su regla dedicada crece demasiado para releerse entera cada vez.
- **Mapa único:** `.agents/rules/MAPA_REGLAS.md` mantiene la tabla código→título→archivo de TODAS las reglas con código, atomizadas o no. Se cita el código corto de siempre; el mapa resuelve a qué archivo apunta hoy. Su mantenimiento (sin huecos: código sin fila, o fila apuntando a archivo inexistente) es chequeo fijo del QA Auditor.

### 1.9 · Concurrencia y colisiones
Varias sesiones/IAs pueden compartir el working directory. Los **locks en PENDING.md** evitan pisarse. Antes de editar un archivo, comprueba que no tenga lock activo de otra sesión. Para trabajo aislado de riesgo, usa un git worktree.

### 1.10 · Sugerencias al núcleo (HS)
- **Motivo:** que una mejora de núcleo detectada en un proyecto consumidor llegue al framework sin depender de que el usuario se acuerde de traerla él mismo a una sesión de ese repo.
- **Cuándo:** si mientras trabajas en este proyecto detectas (o el usuario te pide) una mejora que no es específica de este proyecto sino del harness en sí (protocolo núcleo, mecanismo de `harness.sh`, una receta), escríbela como sugerencia antes de cerrar la tarea.
- **Dónde:** un archivo nuevo en `<HARNESS_SOURCE>/tracking/harness_suggestions/<fecha>_<este-proyecto>_<slug>.md` (ruta de `HARNESS_SOURCE` en `.agents/HARNESS_SOURCE`). Un archivo por sugerencia — nunca añadas a uno compartido, para no chocar con otra sesión escribiendo a la vez. No hace falta commitear ahí: lo recoge el framework en su propia sesión.
- **Plantilla:**
  ```markdown
  ---
  proyecto_origen: <nombre de este proyecto>
  fecha: YYYY-MM-DD
  tipo: mejora-nucleo | idea-exclusiva
  estado: pendiente
  ---

  ## Descripción
  <qué y por qué>

  ## Diff / snippet (si aplica)
  <código o prosa concreta de la mejora>
  ```
- **`tipo: mejora-nucleo`** — genuinamente reusable por cualquier proyecto (protocolo, CLI, receta). **`tipo: idea-exclusiva`** — específica del dominio de este proyecto pero podría adaptarse a otro futuro (ej. un sistema de datado propio de un proyecto narrativo, reutilizable en otro con otra ambientación); se archiva además en `tracking/IDEAS.md` del framework.
- **El campo `estado` no lo cambia el proyecto de origen** — lo marca el framework (`pendiente` → `integrada`/`rechazada`) al triarla en su propia sesión.

---

**Lo que sigue no es núcleo:** roles de subagentes, reglas de dominio propias, estructura de carpetas del proyecto → todo eso vive en `.agents/PROJECT.md`, léelo ahora.
