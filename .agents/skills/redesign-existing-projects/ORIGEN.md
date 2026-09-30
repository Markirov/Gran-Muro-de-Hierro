# ORIGEN — `redesign-existing-projects`

> Este archivo **no es una regla del harness**: es la trazabilidad de una skill de terceros que el framework distribuye tal cual. Los agentes no lo necesitan; existe para que se sepa de dónde salió y cómo actualizarla.

## Procedencia

| Campo | Valor |
|---|---|
| **Upstream** | [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) — `skills/redesign-skill/SKILL.md` |
| **Licencia** | MIT (`LICENSE` en esta misma carpeta, íntegro — requisito de redistribución) |
| **Autoría** | Leonxlnx. **Autoría del harness: ninguna.** Nadie del framework escribió este contenido. |
| **Copiado en** | 2026-09-30 |
| **Versión upstream copiada** | `main` tal cual el 2026-09-30 |
| **Entrada original** | `Trench Crusade/.agents/skills/` (instalada por un tercero el 2026-09-30, sin commitear) |
| **Entrada al núcleo** | Harness v2.9.0, a petición del usuario (gate humano aprobado el 2026-09-30) |

## Reglas de este tipo de entrada

1. **`SKILL.md` es verbatim.** Byte a byte con el upstream (salvo los finales de línea del checkout). No lo edites: si algo está mal, se arregla arriba y se vuelve a copiar.
2. **`LICENSE` viaja con ella.** El MIT obliga a incluir el aviso de licencia en toda copia. Por eso el harness sincroniza *todo* lo que hay bajo `.agents/skills/`, no solo `*.md`.
3. **No lo traduzcas ni lo resumas** sin decidirlo en un gate: crear un fork en español significa mantenerlo, y nadie del harness lo hará. Si hace falta una versión en español, es una decisión de producto, no un retoque.
4. **Actualizar desde upstream** (cuando el usuario lo pida explícitamente):
   ```bash
   curl -sL https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/redesign-skill/SKILL.md \
     -o core/skills/redesign-existing-projects/SKILL.md
   # luego: bash core/verify.sh && bash harness.sh update <consumidor>  (o sync-all)
   ```
   Sube semver (MINOR) y anota el cambio en `CHANGELOG.md` con la fecha del upstream.

## Cuándo invocarla

Cuando el trabajo sea **mejorar el diseño de una interfaz ya existente** (no crearla desde cero): auditoría de patrones genéricos de diseño web, y aplicación de standards sin romper funcionalidad. Es agnóstica de stack (Tailwind, CSS vanilla, o lo que use el proyecto).

No es una skill de **crear** una UI nueva, ni de accesibilidad/legal/compliance por sí sola, ni de diseño de marca. Y no sustituye a `verify.sh`: el build y los tests siguen siendo la puerta antes de commitear.