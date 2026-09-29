# AGENTS.md (raíz) — puntero de protocolo

> Renombra a `AGENTS.md` en la raíz del proyecto. Algunos harnesses (Codex y otros) cargan el `AGENTS.md` de la raíz.
> La fuente **ÚNICA y completa** del protocolo núcleo está en **`.agents/AGENTS.md`**; lo propio de este proyecto (roles, reglas de dominio) está en **`.agents/PROJECT.md`** — lee ambos al empezar cada sesión.

1. Lee `.agents/AGENTS.md` y `.agents/PROJECT.md` al inicio de cada sesión (punto de entrada único).
2. Actualiza SIEMPRE `tracking/DONE.md` y `tracking/PENDING.md` tras cada cambio, y haz el commit (§1.1).
3. NUNCA ejecutes comandos destructivos sin confirmación expresa del usuario.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
