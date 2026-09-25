# goals/ — memoria de ejecución (GOAL.md)

Ver `AGENTS.md` §1.5. Resumen:
- Un `GOAL_<slug>.md` por tarea larga/desatendida — nunca en la raíz.
- Antes de crear uno, anótalo como lock en `PENDING.md`: `(Locks: GOAL_<slug>.md)`.
- Bucle: acción → verificación real → si falla, anota el intento con el error literal → reintenta.
- Corte a los 3 intentos con el mismo error: para, commit parcial, pide intervención.
- Al cerrar, mueve a `tracking/plans/YYYY-MM-DD_GOAL_<slug>.md` y quita el lock. No queda ningún `GOAL_*.md` aquí sin lock activo — el QA Auditor lo audita.

## Plantilla

```markdown
# GOAL: <nombre corto>

**Rol:** <Lead Developer | Data Specialist | Product Owner>
**Iniciado:** YYYY-MM-DD
**Lock en PENDING.md:** (Locks: GOAL_<slug>.md)

## Criterios de éxito (verificables)
- [ ] <criterio comprobable con un comando o lectura objetiva>

## Verificador
<comando exacto o checklist que decide si un criterio está cumplido>

## Registro de intentos
| # | Qué probé | Resultado / error exacto | Siguiente enfoque |
|---|---|---|---|
| 1 | | | |
```
