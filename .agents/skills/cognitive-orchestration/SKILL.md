---
name: cognitive-orchestration
description: >-
  Tactical routing framework and decision matrix for selecting LLM models (Flash-Lite, Flash, Pro)
  and tuning inference-time thinking effort (Low, Medium, High) across project tasks, multi-agent swarms,
  and Dark Heresy 2 architecture workflows.
---

# 🧠 Cognitive Orchestration & Model Selection Framework

> **[SOLO ANTIGRAVITY/GEMINI]** Esta skill usa mecanismos técnicos que solo existen en Antigravity (modelos `flash_lite`/`flash`/`pro`, `invoke_subagent`, comandos `/goal`/`/grill-me`). Si eres Claude Code, **no la invoques** — el criterio agnóstico equivalente (mismo espíritu, sin depender de estas herramientas) ya está en `.agents/AGENTS.md` §1.4.

Este manual establece la estrategia formal para seleccionar modelos de lenguaje (`flash_lite`, `flash`, `pro`) y calibrar el esfuerzo de razonamiento (*Thinking Effort / Test-Time Compute*) en el desarrollo del ecosistema Dark Heresy 2 dentro del IDE y entorno Antigravity.

---

## 1. Recomendación Táctica por Modalidad de Antigravity

| Modalidad / Tarea en Antigravity | Modelo Recomendado | Esfuerzo (Thinking Effort) | Justificación Operativa |
|---|---|---|---|
| **1. Antigravity Tab & Inline (`Ctrl+I`)** | Flash (o Flash-Lite) | **Off / Minimal** | Latencia < 150ms. Autocompletado y edición inline inmediata sin frenar el flujo de escritura. |
| **2. Pair Programming Diario (Chat UI)** | Gemini Flash | **Low** *(⚡ Óptimo)* | Rápido, ágil y reactivo para el 80% de tareas (UI React, CRUDs, corrección de bugs visuales). |
| **3. Planning Mode & Refactors Complejos** | Gemini Flash / Pro | **Medium / High** | Simulación mental de dependencias y contratos antes de comprometer cambios de código. |
| **4. Subagentes Worker (Búsqueda / Tests)** | Flash (Vía `Model: 'flash'`) | **Low** | Aislamiento de lecturas masivas sin saturar el contexto del agente orquestador. |
| **5. Auditorías Críticas & Slash `/goal`** | Gemini Pro | **High / Extended** | Máximo rigor, verificación formal, auto-corrección profunda para tareas complejas o desatendidas. |

---

## 2. ⚡ 5 Estrategias de Optimización Clave

### 1. Enjambre Asimétrico (Delegación de Subagentes)
El agente principal (Lead / Fabricador General) se mantiene en alto nivel de abstracción y delega lecturas extensas de archivos, búsquedas de lore o tareas mecánicas a subagentes con `Model: 'flash'` o `Model: 'flash_lite'`.
> **Impacto:** Reduce hasta un **70% de saturación en la ventana de contexto** del agente principal, manteniendo la sesión ágil y limpia.

### 2. Separación Estricta entre "Planning" y "Execution"
- **Fase de Planificación (Design & Architecture):** Usar **Pro con High Thinking** (o el comando `/grill-me`) para evaluar trade-offs, dependencias y generar el `implementation_plan.md`.
- **Fase de Ejecución (Coding & Build):** Una vez aprobado el plan por el usuario, cambiar a **Flash con Low Thinking** para escribir el código archivo por archivo a máxima velocidad.

### 3. Optimización de Contexto Mediante Reglas y Archivos de Memoria
Centralizar directivas en `.agents/AGENTS.md` (`GEMINI.md` solo apunta ahí), directrices de subagentes en `.agents/rules/` y tableros kanban en `herramientas/md/PENDING.md` y `DONE.md`.
> **Impacto:** Evita que el modelo consuma miles de tokens de pensamiento deduciendo estilos, nomenclaturas prohibidas o el estado del proyecto.

### 4. Uso de Comandos Slash Tácticos
- `/goal`: Para tareas largas, nocturnas o refactorizaciones profundas desatendidas donde un agente con `Pro` debe verificar y no detenerse hasta completar la meta.
- `/grill-me`: Para alinear interactivamente decisiones de diseño ambiguas antes de redactar código o planes.
- `/browser`: Para inspección visual de interfaces o consulta en vivo de documentación.

### 5. Ajuste Dinámico del Esfuerzo (Thresholds de Activación)
Subir el selector de esfuerzo a **Medium / High** únicamente en los siguientes escenarios críticos:
1. Depuración de condiciones de carrera (*Race Conditions*) o *deadlocks* en listeners en tiempo real de Firebase.
2. Diseño de nuevos módulos core interconectados desde cero (ej. motores de cálculo, sistemas de sincronización de campañas).
3. Auditorías de seguridad previas a producción (reglas Firestore, sanitización de entradas).

---

## 3. Matriz de Enrutamiento Táctico (Dark Heresy 2)

| Nivel de Tarea | Ejemplos en Dark Heresy 2 | Modelo Recomendado | Esfuerzo (Thinking) |
|---|---|---|---|
| **Mecánica / Sintaxis** | Generar interfaces TS, transformar JSONs simples, formatear tablas Markdown | `flash_lite` o `flash` | Minimal / Off |
| **Componentes & UI** | Paneles React (`attributes-panel`, `quick-combat`), estilos Tailwind, animaciones | `flash` | Low |
| **Lógica de Reglas / Refactor** | Cálculo de dados D100 con fatiga, cruce de `dh2-skills.json`, tienda XP | `flash` | Medium |
| **Concurrencia & DB** | Listeners en tiempo real Firebase, suscripciones de campaña, resolución de conflictos | `pro` | Medium |
| **Arquitectura & Seguridad** | Modelos core (`character.ts`, `campaign.ts`), reglas de seguridad Firestore, plan maestro | `pro` | High / Extended |
| **Generación Narrativa Grimdark** | Actos de aventuras, diálogos con voces ElevenLabs, briefing de contratistas | `flash` | Low / Medium |
| **Diseño de Tramas Complejas** | Dilemas morales entrelazados, balanceo de Ortodoxia, branching de 4 actos | `pro` | High |

---

## 4. Protocolo de Invocación de Subagentes (`invoke_subagent`)

Cuando un agente orquestador invoque subagentes, **DEBE** asignar explícitamente el parámetro `Model` más eficiente para la tarea:

```typescript
// Ejemplo 1: Tarea de investigación de lore o reglas (Lectura rápida aislada)
invoke_subagent({
  Subagents: [{
    TypeName: "research",
    Role: "Bibliotecario Lore Researcher",
    Model: "flash",
    Prompt: "Investigar en lib/data/dh2-skills.json los bonificadores de Aptitudes..."
  }]
});

// Ejemplo 2: Auditoría de seguridad o diseño de estado distribuido
invoke_subagent({
  Subagents: [{
    TypeName: "self",
    Role: "Security & Architecture Auditor",
    Model: "pro",
    Prompt: "Auditar las reglas de seguridad de Firestore y el modelo de sincronización de contratos..."
  }]
});

// Ejemplo 3: Tarea de formateo masivo o migración sintáctica
invoke_subagent({
  Subagents: [{
    TypeName: "self",
    Role: "JSON Schema Formatter",
    Model: "flash_lite",
    Prompt: "Normalizar los campos de género en todos los JSON de arquetipos..."
  }]
});
```

---

## 5. Jerarquía de Roles en el Enjambre (Dark Heresy 2)

```
                       👑 FABRICADOR GENERAL (Lead / Orchestrator)
                      [Modelo: PRO para Planos | FLASH para Ejecución]
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
    📜 BIBLIOTECARIO           🎲 INQUISIDOR PRIMUS      🛠️ WORKER / EXECUTOR
   (Lore & Compendios)       (Narrativa & Actos JSON)     (Tests & Micro-edits)
  [Modelo: FLASH / FLASH-LITE]  [Modelo: FLASH / PRO]     [Modelo: FLASH-LITE / FLASH]
```

1. **Fabricador General:**
   - Modo Planificación / Arquitectura: `Pro (Thinking High)`.
   - Modo Ejecución / Bugfixing: `Flash (Thinking Low/Med)` para máxima velocidad de respuesta interactiva.
2. **Bibliotecario:**
   - Búsqueda de cánon y reglas: `Flash (Thinking Low)`.
   - Limpieza y formateo de JSONs: `Flash-Lite (Thinking Off)`.
3. **Inquisidor Primus:**
   - Prosa Grimdark, diálogos con etiquetas de voz, actos estándar: `Flash (Thinking Med)`.
   - Diseño de campañas maestras, dilemas morales y contratos complejos: `Pro (Thinking High)`.

---

## 6. Anti-Patrones a Evitar

1. ❌ **"Matar moscas a cañonazos":** No uses `Pro` con esfuerzo máximo para scripts simples de utilidades, arreglar un botón o generar interfaces TypeScript lineales.
2. ❌ **"Optimismo ciego":** No uses modelos `Flash-Lite` sin esfuerzo cognitivo para diseñar arquitecturas de sincronización o validar lógica crítica de juego.
3. ❌ **"Prompt vago con esfuerzo máximo":** Si los requerimientos no están claros, utiliza `/grill-me` primero para alinear el diseño con el usuario en lugar de quemar cómputo en divagaciones.
