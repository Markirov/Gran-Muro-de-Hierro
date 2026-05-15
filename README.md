# Warband Forge

> Companion offline para [Trench Crusade](https://www.trenchcrusade.com) — tarjetas físicas, simulador de batalla y herramientas de mesa.

**[🔗 Probar en directo](https://markirov.github.io/Gran-Muro-de-Hierro/)**

---

## ¿Qué es?

Warband Forge es una herramienta web complementaria a [Trench Companion](https://trench-companion.com), el constructor oficial de bandas para Trench Crusade. Mientras Trench Companion gestiona la composición canónica de la banda y los avances de campaña oficiales, Warband Forge se encarga de lo que ocurre **alrededor de la mesa**.

> Trench Companion construye la banda. Warband Forge la lleva a la mesa.

## Características

- 🃏 **Tarjetas físicas** imprimibles tamaño 63×88mm (formato Magic, 9 por hoja A4)
- ⊞ **Battletrackers** horizontales para llevar el control durante la partida
- 🛒 **Lista de la compra** por banda para planificar futuras adquisiciones
- 🧪 **Sandbox de loadouts experimentales** (en desarrollo) para probar variantes sin alterar la banda canónica
- ⚔ **Simulador de batalla (Lab)** con análisis estadístico de loadouts y amenazas
- 📊 **Análisis tácticos** de unidades contra arquetipos enemigos
- 📜 **Tracking de partidas libres** con house rules

## Flujo de uso

1. Construye y mantén tu banda en [Trench Companion](https://trench-companion.com).
2. Exporta el JSON de la banda desde TC.
3. Importa el JSON en Warband Forge.
4. Imprime tarjetas físicas y battletrackers para llevar a la mesa.
5. Experimenta variantes en el sandbox y simula encuentros en el Lab.
6. Apunta lo que quieras comprar en la lista de la compra.
7. Tras la partida, anota XP y avances oficiales en TC con su Post Game Reporter.

## Uso

### En la web (recomendado)

Visita [https://markirov.github.io/Gran-Muro-de-Hierro/](https://markirov.github.io/Gran-Muro-de-Hierro/). No requiere instalación.

### Localmente

Como es un archivo HTML único, puedes:

1. Clonar el repo: `git clone https://github.com/Markirov/Gran-Muro-de-Hierro.git`
2. Servir con un servidor local (necesario para que jsPDF cargue correctamente):
   ```bash
   cd Gran-Muro-de-Hierro
   python -m http.server 8000
   ```
3. Abrir `http://localhost:8000` en el navegador.

Abrir el HTML directamente con `file://` puede funcionar parcialmente, pero algunas funciones de generación de PDF requieren servidor por restricciones CORS de los CDN.

## Stack técnico

- **HTML single-file** (~32k líneas)
- **JavaScript vanilla**, sin frameworks ni build system
- **jsPDF** (vía CDN, con fallbacks) para generación de PDFs
- **Canvas 2D** para render de tarjetas y battletrackers
- **localStorage** para persistencia; sin backend
- **TDD** (Test-Driven Development) obligatorio en el proceso de desarrollo

Todo el estado vive en el navegador del usuario. No se envían datos a ningún servidor.

## Estado del proyecto

Fase actual: integración de tarjetas y battletrackers completada. En desarrollo activo: **PIVOT v2** — incorporación de sandbox de variantes experimentales y lista de la compra, junto con un rediseño de UI para reflejar el carácter de companion sobre bandas importadas (no builder).

## Disclaimer

**Warband Forge es una herramienta hecha por un fan, para fans.** No está afiliada ni respaldada por Factory Fortress Inc., propietarios de Trench Crusade.

Todo el material del juego — reglas, nombres de unidades, fluff, equipamiento, lore — pertenece a **Factory Fortress Inc.** y se usa aquí únicamente como referencia funcional para los jugadores que ya poseen el juego. Para participar en Trench Crusade, adquiere los materiales oficiales en [https://www.trenchcrusade.com](https://www.trenchcrusade.com).

Las imágenes utilizadas como marca de agua de fondo en las tarjetas provienen de [Wikimedia Commons](https://commons.wikimedia.org) y son de dominio público (fotografías de la Primera Guerra Mundial).

## Créditos

- **Trench Crusade** — © Factory Fortress Inc. — [trenchcrusade.com](https://www.trenchcrusade.com)
- **Trench Companion** — herramienta oficial de gestión de bandas — [trench-companion.com](https://trench-companion.com)
- **Warband Forge** — desarrollado por [@Markirov](https://github.com/Markirov), con asistencia técnica de Claude (Anthropic)

## Licencia

El código de Warband Forge se publica bajo la [MIT License](LICENSE). El contenido del juego de Trench Crusade no se redistribuye y permanece propiedad de Factory Fortress Inc.

---

*"For eight centuries the Church has waged its crusade. The armies are at a stalemate."*
