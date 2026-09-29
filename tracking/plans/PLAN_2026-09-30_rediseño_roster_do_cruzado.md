# PLAN: Rediseño del Modo Roster (La Forja) basado en DO Cruzado

**Fecha:** 2026-09-30  
**Origen:** Propuesta de UX/UI validada en sesión `DO Cruzado` (Benchmarking KTDash, Warcrier, New Recruit)  
**Estado:** Propuesta para aprobación  

---

## 1. Contexto y Objetivos

En la sesión `DO Cruzado`, se analizaron los mejores patrones de UX para juegos de miniaturas grimdark (KTDash, Warcrier, New Recruit) y se identificó que el principal problema de usabilidad de Trench Crusade es la **Armería y la asignación de equipo**:
- Actualmente, `ModelDetails.tsx` presenta un catálogo vertical largo y plano donde cada categoría lista todos los ítems de la facción con botones "+ Seleccionar".
- El modelo mental tradicional de "Mano Izquierda / Mano Derecha" no funciona en Trench Crusade porque las reglas permiten llevar simultáneamente armas de 2 manos a Melee y de 2 manos a Ranged (la restricción de manos es **por categoría**, no anatómica: máx. 2 manos en Melee y máx. 2 manos en Ranged, salvo excepciones como *STRONG*).
- El usuario solicitó adaptar la idea de DO Cruzado a lo que ya tenemos implementado en React, **respetando rigurosamente la paleta de colores actual del proyecto** (oro envejecido `#b8863c`, pergamino `#e2d4b7`, fondos `#0a0503`/`#1a0f0a`/`#2a1610`, bordes `#3a2110`/`#5c3a21`, rojo litúrgico/sangre y gloria `☼`).

---

## 2. Principios de Diseño y Paleta Cromática

### Paleta Grimdark Actual (Inmutable)
- **Fondos principales:** `#0a0503` (fondo absoluto), `#120a06` / `#1a0f0a` (paneles base), `#2a1610` (paneles activos/cabeceras).
- **Bordes y separadores:** `#3a2110` (bordes neutros), `#5c3a21` (bordes destacados), `#b8863c` (borde dorado de selección/foco).
- **Tipografía y Acentos:**
  - Títulos/Números clave: Oro envejecido `#b8863c`, pergamino `#e2d4b7` (fuente serif).
  - Etiquetas/Subtextos: Bronce apagado `#9e9178`, ceniza `#7a6a58`.
  - Costes y Peligro: Rojo sangre (`red-900/50`, `text-red-400`, `border-red-900/50`).
  - Gloria / Puntos de Victoria: Ámbar litúrgico `text-yellow-500` / `☼`.

---

## 3. Arquitectura de Componentes y Cambios Propuestos

### A. `ModelDetails.tsx`: Ficha de Tropa y "Contenedores de Capacidad"

Sustituir el listado plano de armería por 4 **Contenedores de Capacidad (Capacity Slots)** interactivos:

1. **⚔️ Contenedor Melee (Cuerpo a Cuerpo - Capacidad: 2 Manos)**:
   - Indicador visual de manos ocupadas (`0/2`, `1/2` o `2/2 Manos`; si el modelo tiene la keyword *STRONG*, las armas 2H cuentan como 1H).
   - Lista de armas cuerpo a cuerpo equipadas actualmente: tarjetas compactas con nombre, etiquetas (1H, 2H), coste en 👑/☼ y botón de retirada rápida `✕`.
   - Botón contextual `+ Equipar Arma Melee` (o `+ Equipar Mano Secundaria` si queda 1 mano libre).
   - Al pulsar, despliega un selector filtrado que solo muestra las armas compatibles con la capacidad restante (si solo queda 1 mano, las armas 2H se deshabilitan o se ocultan contextualmente).
   - Si la capacidad está completa (2/2), muestra el aviso estilizado *"Capacidad Melee Completa"* y oculta el botón de añadir.

2. **🎯 Contenedor Ranged (A Distancia - Capacidad: 2 Manos)**:
   - Idéntica lógica de capacidad por manos (máx. 2 manos de disparo).
   - Lista de armas a distancia equipadas con perfil rápido (alcance, dados, daño, badges 1H, 2H, Pistol, Heavy) y botón `✕`.
   - Selector contextual inteligente que respeta la capacidad y variantes.

3. **🛡️ Contenedor Armadura y Escudos (Armour & Shields)**:
   - Slot de Armadura Corporal: Tarjeta destacada que muestra la armadura equipada, su modificador al daño (`-1`, `-2`, `-3 INJURY MODIFIER` en vivo) y coste. Botón para cambiar o desequipar.
   - Slot de Escudo: Indicador de si lleva Escudo (`Trench Shield`, etc.), validando si el modelo tiene mano libre o la regla *Shield Combo* / *STRONG*.

4. **🎒 Contenedor Equipo Adicional, Consumibles y Granadas**:
   - Inventario estructurado con chips interactivos para Granadas, Consumibles (ej. *Alchemical Ammunition* con su botón de uso) y Objetos especiales.
   - Posibilidad de añadir y retirar con 1 clic.

5. **Barra de Estadísticas en Vivo y Feedback de Modificadores**:
   - Mantenimiento de los 5 recuadros canónicos (`MOV`, `RNG`, `MEL`, `ARM`, `BASE`).
   - Cálculo en vivo de la armadura total (en negativo `-1`, `-2`, etc.) sincronizado universalmente.
   - Resaltado visual si una estadística está modificada por equipo o heridas/avances.

---

### B. `RosterList.tsx`: Lista de Tropa Mejorada

- **Tarjetas de Unidad de Alta Densidad**:
  - Nombre personalizado del modelo + tipo de tropa base (*Azeb*, *Silahdar*, *Jenizaro*...).
  - Badge de Tier (*LEADER*, *ELITE*, *TROOP*).
  - Resumen visual de equipo en la propia tarjeta: pequeños iconos temáticos con las armas equipadas (ej. `⚔️ Alaybozan · ⛨ Heavy Armour`).
  - Coste total de la miniatura en ducados/gloria destacado en caja propia.
  - Indicador lateral iluminado en oro (`#b8863c`) para la miniatura seleccionada.
  - Botón de eliminar con confirmación segura para evitar borrados accidentales.

---

### C. `page.tsx` (Roster Page): Layout y Responsividad

- **Layout de 2 Columnas en Escritorio (Desktop)**:
  - Columna izquierda (`w-80` a `w-96`): Roster Activo con botón superior prominente `+ Reclutar Tropa` y resumen de miniaturas.
  - Columna derecha (`flex-1`): Editor de Unidad completo (Stats, Contenedores de Capacidad, Upgrades y Reglas).
- **Modo Maestro-Detalle en Móvil / Tablet (< 768px)**:
  - En pantallas estrechas, evitar que ambas columnas compitan por el espacio vertical.
  - Pestañas fluidas o navegación maestro-detalle: ver la lista de tropas -> tocar una tropa entra en la ficha completa con botón `← Volver al Roster`.
- **Barra de Estado Fija (Sticky Header / Summary Bar)**:
  - Presupuesto en vivo: `Ducats 👑` y `Gloria ☼` siempre legibles en la cabecera sin importar el scroll.
  - Botones de acción directos: `📱 Modo Mesa (Libre)` y `⚔ Jugar Partida`.
- **Panel de Legalidad / Alertas en Vivo (Estilo New Recruit)**:
  - Aviso contextual en la parte inferior o lateral si se superan límites de facción (ej. máx. Elites, límite de armas especiales o restricciones de variantes) sin bloquear la creatividad del usuario.

---

## 4. Tareas (checklist de implementación)

### Fase 1: Arquitectura de Datos y Motor de Capacidad de Manos
- [x] 1.1 Crear helper de cálculo de capacidad de manos en `app/lib/cost_calculation.ts` o `app/lib/battlekit_legality_engine.ts` (`getModelMeleeCapacity`, `getModelRangedCapacity`, `getModelArmourAndShield`, `getModelGearAndGrenades` considerando la regla *STRONG*).
- [x] 1.2 Crear función para filtrar armas disponibles según las manos restantes (evitar mostrar armas 2H si solo queda 1 mano disponible).

### Fase 2: Rediseño de `ModelDetails.tsx` (Contenedores de Capacidad)
- [x] 2.1 Maquetar el grid de 4 Contenedores (`Melee`, `Ranged`, `Armadura & Escudo`, `Equipo & Granadas`) con los colores grimdark del proyecto.
- [x] 2.2 Implementar selector contextual desplegable para añadir armas Melee con validación de capacidad (0/2, 1/2, 2/2).
- [x] 2.3 Implementar selector contextual para armas Ranged con validación de capacidad.
- [x] 2.4 Implementar slot específico para Armadura y Escudo con actualización inmediata de `ARM` en los stats.
- [x] 2.5 Implementar slot de Granadas y Equipo misceláneo con chips de retirada `✕`.
- [x] 2.6 Mantener el bloque de Upgrades (Mejoras) y Reglas Especiales de la unidad integrado de forma compacta debajo del equipo.

### Fase 3: Modernización de `RosterList.tsx`
- [ ] 3.1 Actualizar las tarjetas de modelo para mostrar badges de tier y resumen de armas equipadas con iconos temáticos.
- [ ] 3.2 Pulir el estado de selección con borde y resplandor dorado (`#b8863c`).
- [ ] 3.3 Añadir contador de miniaturas y alertas de límite si aplica.

### Fase 4: Layout Responsivo y Cabecera en `page.tsx`
- [ ] 4.1 Implementar navegación responsiva móvil (cambio fluido entre vista lista de banda y vista detalle de miniatura).
- [ ] 4.2 Asegurar que el header con los Ducados y Gloria permanezca sticky o accesible.
- [ ] 4.3 Integrar barra de advertencias de legalidad en vivo (warnings visuales amarillos/naranjas grimdark).

### Fase 5: Verificación, Build y Despliegue
- [x] 5.1 Ejecutar `npm run build` para garantizar cero errores de TypeScript/Turbopack.
- [x] 5.2 Desplegar a Firebase Hosting (`firebase deploy --only hosting`) y confirmar en vivo.
- [ ] 5.3 Commit local y actualización de `tracking/STATE.md` y `tracking/PENDING.md`.
