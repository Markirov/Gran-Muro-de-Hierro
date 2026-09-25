# Mapa de Reglas (código → archivo físico) — sabor lean (3 roles)

> Fuente única para resolver dónde vive HOY el texto de una regla citada por su código corto (ej. "regla D.3") — `AGENTS.md` §1.8. Se cita el código, nunca la ruta; este mapa es lo único que se actualiza cuando una sección se atomiza.
> Mantenimiento: chequeo fijo del QA Auditor (huecos = código sin fila, o fila que apunta a un archivo inexistente).

## Reglas de Oro compartidas (`AGENTS.md` §1.x)

| Código | Título | Archivo |
|---|---|---|
| 1.1–1.9 | Reglas de Oro (registro+commit, gate, esfuerzo, planes+tareas, GOAL, delegación, propiedad del harness, atomización, concurrencia) | `.agents/AGENTS.md` |

## Lead Developer (`.agents/rules/lead_developer.md`)

| Código | Título | Archivo |
|---|---|---|
| D.1 | Verificación obligatoria antes de cerrar tarea | `rules/lead_developer.md` |
| D.2 | TDD obligatorio (patrones module-style / jsdom-style) | `rules/lead_developer.md` |
| D.3 | Separación de capas (canon inmutable, motor puro, UI desde `boot()`) | `rules/lead_developer.md` |
| D.4 | El motor consulta flags, no nombres | `rules/lead_developer.md` |
| D.5 | Fidelidad canon verificada en PDF | `rules/lead_developer.md` |
| D.6 | Single-file sin dependencias nuevas, UI en español | `rules/lead_developer.md` |
| D.7 | Round-trip Companion sin pérdida | `rules/lead_developer.md` |

## Domain & Product Owner · QA Auditor

No atomizados de inicio — sus reglas dedicadas se leen enteras:

| Rol | Archivo |
|---|---|
| Domain & Product Owner | `rules/domain_owner.md` |
| QA Auditor | `rules/qa_auditor.md` |
