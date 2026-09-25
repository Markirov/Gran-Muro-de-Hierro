# GEMINI.md — puntero de protocolo

> El runtime de Gemini/Antigravity carga este archivo automáticamente.
> La fuente **ÚNICA y completa** del protocolo núcleo está en **`.agents/AGENTS.md`**; lo propio de este proyecto (roles, reglas de dominio) está en **`.agents/PROJECT.md`** — lee ambos al empezar cada sesión.

1. Lee `.agents/AGENTS.md` y `.agents/PROJECT.md` al inicio de cada sesión (punto de entrada único).
2. Actualiza SIEMPRE `tracking/DONE.md` y `tracking/PENDING.md` tras cada cambio, y haz el commit (§1.1).
3. NUNCA ejecutes comandos destructivos (`git reset --hard`, `git clean`, `rm -rf`) sin confirmación expresa del usuario.
