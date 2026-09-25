---
name: session-onboarding
description: Protocolo universal de arranque para todos los roles. Lee DONE/PENDING/IDEAS/AUDIT, verifica git y locks, y la regla de rol antes de operar.
---

# Session Onboarding

Ejecuta esta secuencia al inicio de cada sesión, antes de proponer o modificar nada. Implementa `AGENTS.md` §0.

## Pasos
1. **Bootstrap:** `bash init.sh` — git status, dependencias, hook, backlog, aviso de versión del harness.
2. **Lee las 4 fuentes vivas** (`tracking/`): `DONE.md` (últimas 3-5), `PENDING.md` (prioridades + locks), `IDEAS.md`, `AUDIT.md`.
3. **Verifica git:** rama, cambios sin commitear, trabajo ajeno en curso.
4. **Selecciona tarea y pon lock** en `PENDING.md`: `[En progreso - <Rol> (<Herramienta>)] (Locks: <archivo>)`.
5. **Lee tu regla de rol** (`.agents/rules/<rol>.md`, tabla en `AGENTS.md` §2).
6. **Reporte ejecutivo (3 puntos):** contexto inmediato, backlog prioritario de tu rol, locks activos.

## Salida esperada
Saludo breve con tu rol + los 3 puntos. No modifiques nada hasta completar la secuencia.
