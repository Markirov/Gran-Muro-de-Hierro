/* ======================================================================
   LAB 2.0 — SIMULACIÓN ESPACIAL (Sprint 1: foundation)
   ======================================================================
 *
 * Roadmap sección 6. Evolución del Lab abstracto actual hacia simulador
 * con conciencia espacial. No reemplaza el Lab original — coexisten.
 *
 * Sprint 1 (este bloque): SOLO data model + helpers puros.
 *  - LAB2_MAPS: catálogo de mapas canon (48"×32").
 *  - Helpers geométricos sobre grid 1"×1": distancia, line drawing (LoS),
 *    cobertura, elevación.
 *
 * Sprints futuros añadirán: posiciones de modelos, movimiento, IA,
 * sim loop espacial, opción de replay 2D Canvas.
 *
 * Las funciones son puras (sin DOM, sin localStorage). El sim loop
 * posterior consumirá estos helpers para resolver canon-aware LoS/range.
 */

/**
 * Catálogo de mapas para Lab 2.0. Cada mapa:
 *   { id, name, width, height, cells: cells[y][x] = { terrain, cover, elevation } }
 *
 * - width × height en pulgadas (1 celda = 1").
 * - cells[y][x] (row-major, y=fila, x=columna).
 * - terrain: 'open' | 'blocked' (blocked bloquea LoS y movimiento).
 * - cover: 'none' | 'light' | 'heavy' (modificador ranged en canon TC).
 * - elevation: integer (0 = ground; futuras versiones aplicarán bonus
 *   ranged y LoS sobre obstáculos bajos).
 *
 * Canon TC: mesa estándar 48"×32" (= 6'×4'). Confirmado en escenarios
 * IV/V/VI/IX y en el Concentrated Attack "real positioning" del Lab.
 */
function _buildLab2Map(id, name, blockedCells, lightCoverCells, heavyCoverCells, elevationCells) {
  const width = 48, height = 32;
  const cells = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({ terrain: 'open', cover: 'none', elevation: 0 });
    }
    cells.push(row);
  }
  for (const [x, y] of (blockedCells || [])) {
    if (cells[y] && cells[y][x]) cells[y][x].terrain = 'blocked';
  }
  for (const [x, y] of (lightCoverCells || [])) {
    if (cells[y] && cells[y][x]) cells[y][x].cover = 'light';
  }
  for (const [x, y] of (heavyCoverCells || [])) {
    if (cells[y] && cells[y][x]) cells[y][x].cover = 'heavy';
  }
  for (const [x, y, h] of (elevationCells || [])) {
    if (cells[y] && cells[y][x]) cells[y][x].elevation = h;
  }
  return { id, name, width, height, cells };
}

const LAB2_MAPS = (() => {
  const maps = {};

  // Mapa 1: Open Ground — campo abierto, sin obstáculos. Caso baseline para
  // comparar con el Lab abstracto (debería dar resultados similares).
  maps['open-ground'] = _buildLab2Map(
    'open-ground', 'Open Ground (mesa limpia)',
    [], [], [], []
  );

  // Mapa 2: Ruined Village — aldea bombardeada con ruinas dispersas.
  // 6 estructuras (ruinas) repartidas asimétricamente para forzar maniobra.
  // Cada ruina: 3×3 celdas con anillo exterior 'light' cover + interior
  // 1×1 'blocked' (escombros centrales). Total: 6 blocked + 48 light cover.
  const ruins = [
    [10, 6], [16, 10], [22, 7], [26, 18], [34, 12], [38, 22],
  ];
  const blockedRV = [];
  const lightCoverRV = [];
  for (const [cx, cy] of ruins) {
    blockedRV.push([cx, cy]);  // núcleo escombros (bloquea LoS y move).
    // anillo 3×3 light cover.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        lightCoverRV.push([cx + dx, cy + dy]);
      }
    }
  }
  // Algunos cráteres de artillería (heavy cover sin bloquear LoS) para
  // dar opciones tácticas defensivas.
  const heavyCoverRV = [[14, 16], [20, 22], [30, 9], [42, 16], [8, 24]];
  maps['ruined-village'] = _buildLab2Map(
    'ruined-village', 'Ruined Village (aldea bombardeada)',
    blockedRV, lightCoverRV, heavyCoverRV, []
  );

  // Mapa 3: Trenchworks — 3 trincheras horizontales paralelas (y=8,16,24)
  // con gaps periódicos cada 16" para que las bandas puedan avanzar entre
  // ellas. Heavy cover lineal. Canon WWI: hold-the-line / assault-defense.
  const heavyCoverTW = [];
  for (const ty of [8, 16, 24]) {
    for (let x = 0; x < 48; x++) {
      // Gap cada 16" centrado en x=8, 24, 40.
      if (x === 8 || x === 24 || x === 40) continue;
      heavyCoverTW.push([x, ty]);
    }
  }
  maps['trenchworks'] = _buildLab2Map(
    'trenchworks', 'Trenchworks (trincheras paralelas)',
    [], [], heavyCoverTW, []
  );

  // Mapa 4: Highland Pass — 3 colinas centrales elevated + 4 rocas
  // dispersas. Tema Alba / Highland NA. Elevation reservado para
  // futuros refinements (Marksmanship of the Iron Wall + see-over rules).
  const blockedHL = [[6, 14], [42, 18], [12, 26], [36, 6]];  // rocas
  const elevationHL = [];
  for (const [cx, cy, h] of [[18, 12, 2], [28, 18, 2], [24, 24, 1]]) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) {
          elevationHL.push([cx + dx, cy + dy, h]);
        }
      }
    }
  }
  // Light cover en el perímetro de las colinas para diferenciar visualmente.
  const lightCoverHL = [];
  for (const [cx, cy] of [[18, 12], [28, 18], [24, 24]]) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx + ady === 3) lightCoverHL.push([cx + dx, cy + dy]);
      }
    }
  }
  maps['highland-pass'] = _buildLab2Map(
    'highland-pass', 'Highland Pass (colinas + rocas)',
    blockedHL, lightCoverHL, [], elevationHL
  );

  // Mapa 5: City Streets — grid urbano denso. Bloques de edificios 5×5
  // celdas en formación de manzanas con calles entre ellos. Tema WWI
  // urban combat: choke points, LoS limitado, melee favorecido.
  const blockedCS = [];
  for (const [cx, cy] of [
    [6, 4], [16, 4], [28, 4], [40, 4],
    [6, 14], [16, 14], [28, 14], [40, 14],
    [6, 24], [16, 24], [28, 24], [40, 24],
  ]) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        // Interior del bloque: blocked salvo pixel central (puerta).
        if (!(dx === 0 && dy === 0)) {
          blockedCS.push([cx + dx, cy + dy]);
        }
      }
    }
  }
  // Anillo de rubble (light cover) al borde de cada bloque.
  const lightCoverCS = [];
  for (const [cx, cy] of [
    [6, 4], [16, 4], [28, 4], [40, 4],
    [6, 14], [16, 14], [28, 14], [40, 14],
    [6, 24], [16, 24], [28, 24], [40, 24],
  ]) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) === 3 || Math.abs(dy) === 3) {
          lightCoverCS.push([cx + dx, cy + dy]);
        }
      }
    }
  }
  maps['city-streets'] = _buildLab2Map(
    'city-streets', 'City Streets (urbano denso)',
    blockedCS, lightCoverCS, [], []
  );

  // Mapa 6: River Crossing — río horizontal y=14-17 blocked (intraversable),
  // 3 puentes de 3 celdas cada uno en x=8-10, x=22-24, x=38-40. Forza
  // chokepoints tácticos. Riberas con light cover.
  const blockedRC = [];
  for (let y = 14; y <= 17; y++) {
    for (let x = 0; x < 48; x++) {
      // Puentes: x=8-10, x=22-24, x=38-40.
      const isBridge = (x >= 8 && x <= 10) || (x >= 22 && x <= 24) || (x >= 38 && x <= 40);
      if (!isBridge) blockedRC.push([x, y]);
    }
  }
  // Light cover en las riberas (y=12-13 y y=18-19).
  const lightCoverRC = [];
  for (const ry of [12, 13, 18, 19]) {
    for (let x = 0; x < 48; x += 2) lightCoverRC.push([x, ry]);
  }
  maps['river-crossing'] = _buildLab2Map(
    'river-crossing', 'River Crossing (3 puentes)',
    blockedRC, lightCoverRC, [], []
  );

  // Mapa 7: Forest Edge — árboles dispersos (light cover) en formación
  // irregular, claro central. Tema woodland skirmish.
  const lightCoverFE = [];
  // Distribución pseudo-random determinística.
  const treePattern = [
    [3, 3], [5, 7], [8, 4], [10, 9], [13, 5], [15, 11],
    [3, 16], [6, 18], [9, 21], [12, 19], [15, 23],
    [3, 26], [7, 28], [11, 26], [14, 30],
    [33, 3], [36, 6], [39, 4], [42, 8], [45, 5], [33, 11],
    [36, 28], [39, 26], [42, 30], [45, 28], [33, 23],
    // Algunos en el medio en línea irregular.
    [20, 6], [22, 8], [25, 5], [27, 10],
    [20, 24], [23, 26], [26, 22], [29, 27],
  ];
  for (const [tx, ty] of treePattern) {
    // Cada árbol = celda central + 3-4 vecinas como light cover (canopy).
    lightCoverFE.push([tx, ty]);
    if (tx + 1 < 48) lightCoverFE.push([tx + 1, ty]);
    if (ty + 1 < 32) lightCoverFE.push([tx, ty + 1]);
  }
  maps['forest-edge'] = _buildLab2Map(
    'forest-edge', 'Forest Edge (claros y árboles)',
    [], lightCoverFE, [], []
  );

  // Mapa 8: Bunker Complex — 6 bunkers heavy cover en formación
  // defensiva canon WWI. Zona central abierta tipo "killing field".
  // Bunkers 2×3 celdas heavy. Defensive setup natural.
  const heavyCoverBC = [];
  const bunkerCenters = [
    [10, 6], [24, 4], [38, 6],   // línea norte
    [10, 26], [24, 28], [38, 26], // línea sur
  ];
  for (const [cx, cy] of bunkerCenters) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        heavyCoverBC.push([cx + dx, cy + dy]);
      }
    }
  }
  // Algunos sandbags lineales (light cover) entre bunkers.
  const lightCoverBC = [];
  for (let x = 14; x <= 20; x++) lightCoverBC.push([x, 10]);
  for (let x = 28; x <= 34; x++) lightCoverBC.push([x, 10]);
  for (let x = 14; x <= 20; x++) lightCoverBC.push([x, 22]);
  for (let x = 28; x <= 34; x++) lightCoverBC.push([x, 22]);
  maps['bunker-complex'] = _buildLab2Map(
    'bunker-complex', 'Bunker Complex (defensivo WWI)',
    [], lightCoverBC, heavyCoverBC, []
  );

  // Mapa 9: Mountain Pass Canyon. Paredes blocked en bordes superior +
  // inferior (4 filas cada uno). Centro abierto con colinas elevated +
  // light cover de rocas dispersas.
  const blockedMP = [];
  for (let x = 0; x < 48; x++) {
    for (let y = 0; y < 4; y++) blockedMP.push([x, y]);
    for (let y = 28; y < 32; y++) blockedMP.push([x, y]);
  }
  const elevationMP = [];
  for (const [cx, cy, h] of [[14, 14, 2], [24, 16, 3], [34, 14, 2]]) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        elevationMP.push([cx + dx, cy + dy, h]);
      }
    }
  }
  const lightCoverMP = [];
  for (const [rx, ry] of [
    [8, 10], [12, 20], [20, 9], [28, 22], [36, 11], [42, 18],
  ]) {
    lightCoverMP.push([rx, ry], [rx + 1, ry]);
  }
  maps['mountain-pass-canyon'] = _buildLab2Map(
    'mountain-pass-canyon', 'Mountain Pass Canyon (paredes + colinas)',
    blockedMP, lightCoverMP, [], elevationMP
  );

  // Mapa 10: Desert Convoy. Mapa abierto con caravana de 4 camiones
  // (3×2 cada uno) en línea central y=15-17. Dunas light cover dispersas.
  const blockedDC = [];
  for (const cx of [8, 18, 28, 38]) {
    for (let dy = 15; dy <= 17; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        blockedDC.push([cx + dx, dy]);
      }
    }
  }
  const lightCoverDC = [];
  for (const [dx, dy] of [
    [4, 6], [13, 8], [22, 5], [31, 7], [40, 6],
    [4, 25], [13, 27], [22, 24], [31, 26], [40, 25],
  ]) {
    for (let off = 0; off < 3; off++) lightCoverDC.push([dx + off, dy]);
  }
  maps['desert-convoy'] = _buildLab2Map(
    'desert-convoy', 'Desert Convoy (caravana central)',
    blockedDC, lightCoverDC, [], []
  );

  // Mapa 11: Hellscape. Terreno demoníaco con 8 cráteres heavy +
  // "fire walls" light cover quemada + obstáculos infernales blocked.
  const blockedHS = [];
  for (const [bx, by] of [
    [10, 8], [22, 6], [38, 10],
    [8, 22], [26, 24], [40, 20],
    [16, 16], [34, 16],
  ]) {
    blockedHS.push([bx, by], [bx + 1, by]);
  }
  const heavyCoverHS = [];
  for (const [cx, cy] of [
    [6, 14], [14, 6], [20, 22], [30, 8],
    [36, 14], [42, 24], [10, 26], [32, 26],
  ]) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) heavyCoverHS.push([cx, cy]);
        else if (Math.abs(dx) + Math.abs(dy) === 1) heavyCoverHS.push([cx + dx, cy + dy]);
      }
    }
  }
  const lightCoverHS = [];
  for (let y = 12; y <= 20; y += 4) {
    for (let x = 4; x < 44; x += 6) lightCoverHS.push([x, y], [x + 1, y]);
  }
  maps['hellscape'] = _buildLab2Map(
    'hellscape', 'Hellscape (demoníaco)',
    blockedHS, lightCoverHS, heavyCoverHS, []
  );

  return maps;
})();

/** Distancia Chebyshev (movimiento ortogonal + diagonal cuesta 1 celda).
 * Usada para coste de movimiento en grid; NO para rangos canon (esa es
 * inchesBetween). */
function gridDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Distancia Euclídea en pulgadas. Trench Crusade mide rangos con regla
 * recta de centro a centro. Cada celda es 1"×1". */
function inchesBetween(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Bresenham: lista de celdas atravesadas por la línea recta entre a y b
 * (ambos inclusive). Útil para LoS y trazado visual. Si a == b devuelve
 * [{a}]. Devuelve objetos {x, y} (no muta).
 *
 * Implementación clásica all-octants. */
function lineCells(a, b) {
  if (!a || !b) return [];
  let x0 = a.x | 0, y0 = a.y | 0;
  const x1 = b.x | 0, y1 = b.y | 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const out = [];
  while (true) {
    out.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
    // Guard anti-infinite loop (no debería dispararse con inputs sanos).
    if (out.length > 200) break;
  }
  return out;
}

/** Devuelve la celda del mapa en (x,y), o null si fuera de bounds. */
function _lab2CellAt(map, pos) {
  if (!map || !map.cells || !pos) return null;
  const x = pos.x | 0, y = pos.y | 0;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const row = map.cells[y];
  return row ? row[x] || null : null;
}

/** Cobertura de la celda: 'none' | 'light' | 'heavy'. Fuera de mapa → 'none'. */
function getCellCover(map, pos) {
  const c = _lab2CellAt(map, pos);
  return c ? (c.cover || 'none') : 'none';
}

/** Elevación de la celda. Fuera de mapa → 0. */
function getCellElevation(map, pos) {
  const c = _lab2CellAt(map, pos);
  return c ? (c.elevation || 0) : 0;
}

/** Terreno de la celda: 'open' | 'blocked'. Fuera de mapa → 'blocked'
 * (para que LoS y movimiento traten los bordes como pared). */
function getCellTerrain(map, pos) {
  const c = _lab2CellAt(map, pos);
  return c ? (c.terrain || 'open') : 'blocked';
}

/** Hay línea de visión entre a y b si ninguna celda intermedia
 * (excluyendo origen y destino) es 'blocked'. V1: ignora elevation;
 * sprints futuros añadirán reglas canon de Elevated Position +
 * "see over low obstacles". */
function hasLineOfSight(map, a, b) {
  if (!map) return false;
  const cells = lineCells(a, b);
  // Excluye origen y destino — el modelo está en su celda, no se bloquea
  // a sí mismo, y un blocker JUSTO en el destino es el target en sí.
  for (let i = 1; i < cells.length - 1; i++) {
    if (getCellTerrain(map, cells[i]) === 'blocked') return false;
  }
  return true;
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 2 — Estado de batalla + posiciones + movimiento.
   ----------------------------------------------------------------------
 * Construye sobre Sprint 1 (mapas + helpers). Añade objeto de estado de
 * batalla con posiciones por side, helpers de movimiento canon-aware
 * (budget según stat MOV, terreno, overlap) y queries de rango + LoS
 * entre modelos.
 *
 * Sin sim loop, sin AI todavía. Sprints 3-4 los añaden encima.
 */

/** Parsea el stat MOV companion (ej "6"/Infantry") a pulgadas integer.
 * Fallback: 6" canon Infantry si stat ausente/inparseable. */
function getModelMoveBudget(model) {
  if (!model) return 6;
  const stat = (model.companionStats && model.companionStats.move)
    || (model.stats && model.stats.movement)
    || (model.stats && model.stats.move)
    || '6"/Infantry';
  const m = String(stat).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 6;
}

/** Crea el estado inicial de batalla Lab 2.0.
 *   mapId: clave en LAB2_MAPS.
 *   friendlyModels, enemyModels: arrays de modelos (companion-aware).
 *
 * Returns: { mapId, map, friendly:{models,positions}, enemy:{...}, turn, activated }.
 * Posiciones empiezan vacías — el caller las setea con placeModel. */
function createLab2Battle(mapId, friendlyModels, enemyModels, opts) {
  opts = opts || {};
  const map = LAB2_MAPS[mapId];
  if (!map) throw new Error('Mapa desconocido: ' + mapId);
  return {
    mapId,
    map,
    friendly: {
      models: (friendlyModels || []).slice(),
      positions: {},
      minesRemaining: opts.friendlyMines | 0,
    },
    enemy: {
      models: (enemyModels || []).slice(),
      positions: {},
      minesRemaining: opts.enemyMines | 0,
    },
    turn: 1,
    activated: new Set(),
    // Sprint 28: fireCells Map<"x,y", {turnsRemaining}> para fire persistente.
    fireCells: new Map(),
    // Sprint 30: AI style del enemy ('balanced'|'aggressive'|'defensive').
    enemyAIStyle: opts.enemyAIStyle || 'balanced',
  };
}

/** Sprint 28: NEGATE FIRE keyword detection. */
function hasNegateFire(model) {
  return _lab2HasKeyword(model, 'NEGATE FIRE');
}

/** Sprint 28: marca celda con fire persistente. Si ya hay fire, refresca
 * turnsRemaining al máximo de los dos valores (no apila daño, solo tiempo). */
function markFireCell(state, pos, turns) {
  if (!state || !state.fireCells || !pos) return;
  const key = (pos.x | 0) + ',' + (pos.y | 0);
  const existing = state.fireCells.get(key);
  const newTurns = Math.max(existing ? existing.turnsRemaining : 0, turns | 0 || 2);
  state.fireCells.set(key, { turnsRemaining: newTurns });
}

/** Sprint 28: aplica daño FIRE a modelos en fire cells. Retorna uids KO. */
function processFireDamage(state, rng) {
  if (!state || !state.fireCells) return [];
  const _rng = rng || Math.random;
  const kos = [];
  for (const [key] of state.fireCells.entries()) {
    const [xs, ys] = key.split(',');
    const x = parseInt(xs, 10), y = parseInt(ys, 10);
    const occ = modelAt(state, { x, y });
    if (!occ) continue;
    if (hasNegateFire(occ.model)) continue;
    if (_rng() < 0.35) {
      if (!modelTriesRegenerate(occ.model, _rng)) {
        kos.push(occ.model.uid);
        markModelOut(state, occ.model.uid);
      }
    }
  }
  return kos;
}

/** Sprint 28: decrementa turnsRemaining + elimina celdas expiradas. */
function tickFireCells(state) {
  if (!state || !state.fireCells) return;
  for (const [key, val] of Array.from(state.fireCells.entries())) {
    val.turnsRemaining -= 1;
    if (val.turnsRemaining <= 0) state.fireCells.delete(key);
  }
}

/** Sprint 26: NEGATE MINED keyword detection. */
function hasNegateMined(model) {
  return _lab2HasKeyword(model, 'NEGATE MINED');
}

/** Sprint 26: trigger MINED en charge canon. 25% chance de proc si
 * defender tiene minas y attacker NO tiene NEGATE MINED. Decrementa
 * minesRemaining si proc.
 * Returns: { triggered, ko } */
function triggerMinedCharge(state, attackerUid, targetUid, rng) {
  if (!state) return { triggered: false, ko: false };
  const attacker = _lab2GetModelByUid(state, attackerUid);
  const targetSide = _lab2GetSideForUid(state, targetUid);
  if (!attacker || !targetSide) return { triggered: false, ko: false };
  if (hasNegateMined(attacker)) return { triggered: false, ko: false };
  const minesRem = state[targetSide].minesRemaining | 0;
  if (minesRem <= 0) return { triggered: false, ko: false };
  const r = (rng || Math.random)();
  if (r >= 0.25) return { triggered: false, ko: false };
  state[targetSide].minesRemaining = minesRem - 1;
  // 50% del proc resulta en KO del charger (canon: injury roll separado).
  const koRoll = (rng || Math.random)();
  const ko = koRoll < 0.50;
  if (ko) markModelOut(state, attackerUid);
  return { triggered: true, ko };
}

function _lab2GetSideForUid(state, uid) {
  if (!state || !uid) return null;
  if (state.friendly.models.some(m => m.uid === uid)) return 'friendly';
  if (state.enemy.models.some(m => m.uid === uid))    return 'enemy';
  return null;
}

function _lab2GetModelByUid(state, uid) {
  if (!state || !uid) return null;
  return state.friendly.models.find(m => m.uid === uid)
      || state.enemy.models.find(m => m.uid === uid)
      || null;
}

/** Sitúa un modelo en (pos) sin validar (caller responsable). Útil
 * en deployment inicial. Para movimiento durante batalla, usar moveModel. */
function placeModel(state, side, modelUid, pos) {
  if (!state || (side !== 'friendly' && side !== 'enemy')) return false;
  state[side].positions[modelUid] = { x: pos.x | 0, y: pos.y | 0 };
  return true;
}

/** Posición actual de un modelo, o null si no está colocado. */
function getModelPosition(state, uid) {
  if (!state) return null;
  return state.friendly.positions[uid] || state.enemy.positions[uid] || null;
}

/** Devuelve { side, model } en (pos), o null si vacía. */
function modelAt(state, pos) {
  if (!state || !pos) return null;
  const px = pos.x | 0, py = pos.y | 0;
  for (const side of ['friendly', 'enemy']) {
    const positions = state[side].positions;
    for (const uid of Object.keys(positions)) {
      const p = positions[uid];
      if (p.x === px && p.y === py) {
        const model = state[side].models.find(m => m.uid === uid);
        return { side, model };
      }
    }
  }
  return null;
}

/** Valida si un modelo puede moverse a (pos). Chequea:
 *  - Budget: distancia ≤ stat MOV en pulgadas.
 *  - Terreno: celda destino no 'blocked'.
 *  - Overlap: ninguna otra unidad en destino.
 * Returns { ok, error? }. */
function canMoveTo(state, uid, pos) {
  if (!state) return { ok: false, error: 'Estado inválido.' };
  const model = _lab2GetModelByUid(state, uid);
  if (!model) return { ok: false, error: 'Modelo no encontrado: ' + uid };
  const from = getModelPosition(state, uid);
  if (!from) return { ok: false, error: 'Modelo sin posición inicial: ' + uid };
  // Bounds.
  if (pos.x < 0 || pos.y < 0 || pos.x >= state.map.width || pos.y >= state.map.height) {
    return { ok: false, error: 'Destino fuera del mapa.' };
  }
  // Budget canon (en pulgadas).
  const budget = getModelMoveBudget(model);
  const dist = inchesBetween(from, pos);
  if (dist > budget + 0.001) {
    return { ok: false, error: 'Excede budget de movimiento ' + budget + '" (distancia ' + dist.toFixed(1) + '").' };
  }
  // Terreno.
  if (getCellTerrain(state.map, pos) === 'blocked') {
    return { ok: false, error: 'Celda destino tiene terreno bloqueado.' };
  }
  // Overlap (excepto si es la celda actual).
  if (!(pos.x === from.x && pos.y === from.y)) {
    const occ = modelAt(state, pos);
    if (occ) return { ok: false, error: 'Celda ocupada por otro modelo.' };
  }
  return { ok: true };
}

/** Mueve un modelo si canMoveTo lo permite. Retorna { ok, error? }. */
function moveModel(state, uid, pos) {
  const check = canMoveTo(state, uid, pos);
  if (!check.ok) return check;
  const side = _lab2GetSideForUid(state, uid);
  if (!side) return { ok: false, error: 'Side no resuelto.' };
  state[side].positions[uid] = { x: pos.x | 0, y: pos.y | 0 };
  return { ok: true };
}

/** UIDs de modelos enemigos dentro de rangeInches (Euclídea). Si el atacante
 * es friendly, devuelve enemy uids; viceversa. */
function modelsInRange(state, uid, rangeInches) {
  if (!state) return [];
  const fromSide = _lab2GetSideForUid(state, uid);
  if (!fromSide) return [];
  const enemySide = fromSide === 'friendly' ? 'enemy' : 'friendly';
  const from = getModelPosition(state, uid);
  if (!from) return [];
  const out = [];
  const positions = state[enemySide].positions;
  for (const targetUid of Object.keys(positions)) {
    const p = positions[targetUid];
    if (inchesBetween(from, p) <= rangeInches + 0.001) out.push(targetUid);
  }
  return out;
}

/** LoS entre dos modelos por uid. Wrapper que recupera posiciones y delega
 * en hasLineOfSight. */
function hasLineOfSightBetween(state, uidA, uidB) {
  if (!state) return false;
  const a = getModelPosition(state, uidA);
  const b = getModelPosition(state, uidB);
  if (!a || !b) return false;
  return hasLineOfSight(state.map, a, b);
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 3 — IA heurística (deployment + target + action).
   ----------------------------------------------------------------------
 * Construye sobre Sprint 1+2. Añade decisiones automáticas para el sim
 * loop futuro (Sprint 4). Heurísticas simples — no minimax, no MCTS.
 *
 * Filosofía: la IA enemiga del Lab 2.0 debe ser lo bastante competente
 * para que las stats agregadas tengan sentido, pero NO ser un jugador
 * óptimo. El jugador humano de Trench Crusade tampoco juega perfecto.
 */

/** Zona de deployment canon: cada side ocupa 12 filas de su lado del
 * tablero (canon TC ~12" deployment zone). Spans todo el ancho.
 * Friendly = inferior (y bajo). Enemy = superior (y alto). */
function getDeploymentZone(state, side) {
  if (!state || !state.map) return null;
  // Zonas canon TC ~6" cada lado del tablero. Resultado: ~21" gap
  // entre deployments (y=0-5 friendly, y=26-31 enemy). Esto fuerza
  // que weapons cortas (≤16") tengan que avanzar para enganchar →
  // sim más realista con mix de shoot/advance/charge/melee en vez
  // de disparos estáticos desde turn 1.
  // (Antes Sprint 33 era 12" — todos disparaban desde deploy sin
  // advance, ningún melee.)
  const zoneHeight = 6;
  if (side === 'friendly') {
    return { xMin: 0, xMax: state.map.width - 1, yMin: 0, yMax: zoneHeight - 1 };
  }
  return {
    xMin: 0, xMax: state.map.width - 1,
    yMin: state.map.height - zoneHeight, yMax: state.map.height - 1,
  };
}

function _isEliteModel(model) {
  if (!model) return false;
  if (model.tier === 'elite') return true;
  const kws = model.companionKeywords || [];
  return kws.some(k => {
    const name = typeof k === 'string' ? k : (k && k.name) || '';
    return /^elite$/i.test(name);
  });
}

/** Coloca todos los modelos del side en su zona de deployment.
 *
 * Estrategia V1:
 *  1. Sort: ELITE primero, troops después. Esto es porque ELITE va a la
 *     fila de vanguardia (más cerca de la centerline), troops al fondo.
 *  2. Para cada modelo, escanea celdas válidas en orden semántico:
 *     - Friendly: from-centerline-back (y descendente desde yMax) — los
 *       primeros modelos (ELITE) quedan en y=yMax, los últimos atrás.
 *     - Enemy: from-centerline-back (y ascendente desde yMin) — espejo.
 *  3. Salta celdas blocked / ocupadas.
 *  4. Dentro de cada y, escanea x desde el centro hacia los bordes para
 *     concentrar la línea (mejor LoS canon-correct).
 *
 * No usa RNG: el deployment es determinístico para que la simulación
 * sea reproducible turno a turno. */
function deployBandHeuristic(state, side) {
  if (!state || (side !== 'friendly' && side !== 'enemy')) return false;
  const zone = getDeploymentZone(state, side);
  // Sprint 18: INFILTRATOR colocados primero en filas más avanzadas
  // (4" más allá de yMax/yMin canon). Sort por: infiltrator > elite > troops.
  const models = state[side].models.slice().sort((a, b) => {
    const aPrio = isModelInfiltrator(a) ? 0 : (_isEliteModel(a) ? 1 : 2);
    const bPrio = isModelInfiltrator(b) ? 0 : (_isEliteModel(b) ? 1 : 2);
    return aPrio - bPrio;
  });
  // Orden de filas según side + INFILTRATOR flag.
  function buildYSeq(model) {
    const seq = [];
    const infBoost = isModelInfiltrator(model) ? 4 : 0;
    if (side === 'friendly') {
      const yMax = Math.min(state.map.height - 1, zone.yMax + infBoost);
      for (let y = yMax; y >= zone.yMin; y--) seq.push(y);
    } else {
      const yMin = Math.max(0, zone.yMin - infBoost);
      for (let y = yMin; y <= zone.yMax; y++) seq.push(y);
    }
    return seq;
  }
  // Orden de x: centro → bordes (concentra la línea).
  const center = Math.floor(state.map.width / 2);
  const xSeq = [];
  xSeq.push(center);
  for (let off = 1; off < state.map.width; off++) {
    if (center - off >= 0) xSeq.push(center - off);
    if (center + off < state.map.width) xSeq.push(center + off);
  }
  for (const model of models) {
    const ySeq = buildYSeq(model);
    let placed = false;
    for (const y of ySeq) {
      for (const x of xSeq) {
        const pos = { x, y };
        if (getCellTerrain(state.map, pos) === 'blocked') continue;
        if (modelAt(state, pos)) continue;
        placeModel(state, side, model.uid, pos);
        placed = true;
        break;
      }
      if (placed) break;
    }
  }
  return true;
}

/** Devuelve el uid del enemigo "óptimo" para disparar — el más cercano
 * con LoS limpia dentro del rango. Si ninguno cumple → null.
 *
 * V1: distancia pura. V2+ podría ponderar threat (HP bajo, ranged alto). */
function chooseTargetHeuristic(state, attackerUid, rangeInches) {
  if (!state || !attackerUid) return null;
  const candidates = modelsInRange(state, attackerUid, rangeInches);
  if (candidates.length === 0) return null;
  const from = getModelPosition(state, attackerUid);
  let bestUid = null, bestDist = Infinity;
  for (const uid of candidates) {
    if (!hasLineOfSightBetween(state, attackerUid, uid)) continue;
    const p = getModelPosition(state, uid);
    const d = inchesBetween(from, p);
    if (d < bestDist) { bestDist = d; bestUid = uid; }
  }
  return bestUid;
}

/** Devuelve uid del enemigo más cercano sin filtrar por rango ni LoS.
 * Útil para "advance hacia el más amenazante visible o no". */
function _lab2NearestEnemy(state, attackerUid) {
  if (!state || !attackerUid) return null;
  const fromSide = _lab2GetSideForUid(state, attackerUid);
  if (!fromSide) return null;
  const enemySide = fromSide === 'friendly' ? 'enemy' : 'friendly';
  const from = getModelPosition(state, attackerUid);
  if (!from) return null;
  let bestUid = null, bestDist = Infinity;
  const positions = state[enemySide].positions;
  for (const uid of Object.keys(positions)) {
    const d = inchesBetween(from, positions[uid]);
    if (d < bestDist) { bestDist = d; bestUid = uid; }
  }
  return bestUid;
}

/** Sprint 24: detecta si algún equipment del modelo tiene la keyword
 * (inline en eq.weaponKeywords o vía DATA.armoury). Útil para CLEAVE,
 * FIRE, IGNORE ARMOUR, etc. */
function hasWeaponKeyword(model, kw, factionId) {
  if (!model || !Array.isArray(model.companionEquipment)) return false;
  const kwU = String(kw).toUpperCase();
  for (const eq of model.companionEquipment) {
    if (!eq) continue;
    const inline = eq.weaponKeywords || eq['weapon-keywords'] || [];
    if (Array.isArray(inline) && inline.some(k => String(k).toUpperCase() === kwU)) return true;
    if (inline && typeof inline.has === 'function' && inline.has(kwU)) return true;
    if (factionId && typeof DATA !== 'undefined' && DATA.factions && DATA.factions[factionId]) {
      const armoury = DATA.factions[factionId].armoury || {};
      const name = eq.name || eq['equipment-name'] || '';
      if (!name) continue;
      for (const cat of ['ranged', 'melee', 'grenades']) {
        const list = armoury[cat] || [];
        const entry = list.find(w => w.name === name);
        if (entry && Array.isArray(entry.weaponKeywords) &&
            entry.weaponKeywords.some(k => String(k).toUpperCase() === kwU)) return true;
      }
    }
  }
  return false;
}

/** Sprint 29: parsea AUTOMATIC X de weaponKeywords. Devuelve X o 1. */
function parseAutomaticCount(eqItem, factionId) {
  if (!eqItem) return 1;
  const _scan = (kws) => {
    if (!kws) return 0;
    const arr = Array.isArray(kws) ? kws : (typeof kws.values === 'function' ? Array.from(kws) : []);
    for (const k of arr) {
      const m = String(k).match(/AUTOMATIC\s+(\d+)/i);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  };
  const inline = _scan(eqItem.weaponKeywords || eqItem['weapon-keywords']);
  if (inline > 0) return inline;
  if (factionId && typeof DATA !== 'undefined' && DATA.factions && DATA.factions[factionId]) {
    const armoury = DATA.factions[factionId].armoury || {};
    const name = eqItem.name || eqItem['equipment-name'] || '';
    for (const cat of ['ranged', 'melee', 'grenades']) {
      const list = armoury[cat] || [];
      const entry = list.find(w => w.name === name);
      if (entry) {
        const r = _scan(entry.weaponKeywords);
        if (r > 0) return r;
      }
    }
  }
  return 1;
}

/** Sprint 27: parsea BLAST radius de las weaponKeywords del item.
 *
 * Returns: número (pulgadas) o 0 si no hay BLAST. */
function parseBlastRadius(eqItem, factionId) {
  if (!eqItem) return 0;
  const _scan = (kws) => {
    if (!kws) return 0;
    const arr = Array.isArray(kws) ? kws : (typeof kws.values === 'function' ? Array.from(kws) : []);
    for (const k of arr) {
      const m = String(k).match(/BLAST\s+(\d+)"?/i);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  };
  // Inline.
  const inline = _scan(eqItem.weaponKeywords || eqItem['weapon-keywords']);
  if (inline > 0) return inline;
  // Armoury lookup.
  if (factionId && typeof DATA !== 'undefined' && DATA.factions && DATA.factions[factionId]) {
    const armoury = DATA.factions[factionId].armoury || {};
    const name = eqItem.name || eqItem['equipment-name'] || '';
    for (const cat of ['ranged', 'melee', 'grenades']) {
      const list = armoury[cat] || [];
      const entry = list.find(w => w.name === name);
      if (entry) {
        const r = _scan(entry.weaponKeywords);
        if (r > 0) return r;
      }
    }
  }
  return 0;
}

/** Sprint 27: aplica splash KOs a enemigos en radio de blast del target.
 * Excluye el target original. V1: 30% KO chance por nearby con
 * REGENERATE save proc respetado.
 * Returns: array de uids KO'd. */
function applyBlastSplash(state, attackerUid, radius, targetUid, rng) {
  if (!state || !radius || radius <= 0) return [];
  const targetPos = getModelPosition(state, targetUid);
  if (!targetPos) return [];
  const targetSide = _lab2GetSideForUid(state, targetUid);
  if (!targetSide) return [];
  const _rng = rng || Math.random;
  const positions = state[targetSide].positions;
  const kos = [];
  for (const uid of Object.keys(positions)) {
    if (uid === targetUid) continue;
    const p = positions[uid];
    if (inchesBetween(targetPos, p) > radius + 0.001) continue;
    if (_rng() < 0.30) {
      const m = _lab2GetModelByUid(state, uid);
      if (!modelTriesRegenerate(m, _rng)) {
        kos.push(uid);
        markModelOut(state, uid);
      }
    }
  }
  return kos;
}

/** Sprint 31: devuelve models de la banda con overrides de variante
 * aplicados. Usado por Lab 2.0 para simular sandbox loadouts.
 * Fallback al wb.models canon si variantId no existe. */
function _lab2BandFromVariant(wb, variantId) {
  if (!wb || !Array.isArray(wb.models)) return [];
  if (!variantId || variantId === 'canon') {
    return wb.models.map(m => JSON.parse(JSON.stringify(m)));
  }
  if (typeof applyVariantOverrides !== 'function') {
    return wb.models.map(m => JSON.parse(JSON.stringify(m)));
  }
  const clone = applyVariantOverrides(wb, variantId);
  return (clone && Array.isArray(clone.models)) ? clone.models : [];
}

/** Sprint 25: detecta si un equipment item es Glory (currency='☼').
 * Lookup en DATA.armoury — items sin entry → false (no se asume nada).
 */
function isGloryItem(eqItem, factionId) {
  if (!eqItem || !factionId) return false;
  if (typeof DATA === 'undefined' || !DATA.factions || !DATA.factions[factionId]) return false;
  const armoury = DATA.factions[factionId].armoury || {};
  const name = eqItem.name || eqItem['equipment-name'] || '';
  if (!name) return false;
  for (const cat of ['ranged', 'melee', 'grenades', 'shields', 'armour', 'equipment']) {
    const list = armoury[cat] || [];
    const entry = list.find(w => w.name === name);
    if (entry && entry.currency === '☼') return true;
  }
  return false;
}

/** Sprint 25: cuenta glory items en companionEquipment. */
function countGloryItems(model, factionId) {
  if (!model || !Array.isArray(model.companionEquipment)) return 0;
  let n = 0;
  for (const eq of model.companionEquipment) {
    if (isGloryItem(eq, factionId)) n++;
  }
  return n;
}

/** Sprint 25: bonus de hit chance por glory items. V1 abstracto:
 * 0.05 × min(count, 3) → cap +0.15. Proxy para los buffs que aportan
 * en mesa (Troop Flag morale aura, Field Shrine, etc.) sin modelar
 * cada uno individualmente. */
function gloryHitBonus(model, factionId) {
  const n = countGloryItems(model, factionId);
  return Math.min(n, 3) * 0.05;
}

/** Sprint 24: REGENERATE save proc. Si modelo tiene keyword REGENERATE,
 * 25% chance de salvarse del KO. */
function modelTriesRegenerate(model, rng) {
  if (!model || !_lab2HasKeyword(model, 'REGENERATE')) return false;
  const r = (rng || Math.random)();
  return r < 0.25;
}

function _lab2HasKeyword(model, kw) {
  if (!model || !Array.isArray(model.companionKeywords)) return false;
  const kwU = String(kw).toUpperCase();
  return model.companionKeywords.some(k => {
    const name = typeof k === 'string' ? k : (k && k.name) || '';
    return name.toUpperCase() === kwU;
  });
}

/** Sprint 18: detecta keyword FLYING (puede pasar sobre obstáculos). */
function isModelFlying(model) { return _lab2HasKeyword(model, 'FLYING'); }

/** Sprint 18: detecta keyword INFILTRATOR (deploy avanzado, hasta
 * 4" más allá del yMax/yMin canon de su zona). */
function isModelInfiltrator(model) { return _lab2HasKeyword(model, 'INFILTRATOR'); }

/** Sprint 17: detecta si un modelo va equipado con HEAVY weapon.
 * Canon TC: HEAVY weapon impide Move ACTION en el mismo turno que dispara.
 *
 * Detección en orden de prioridad:
 *   1. equipment[i].weaponKeywords incluye 'HEAVY' (inline canon).
 *   2. Lookup en DATA.armoury por nombre del equipo → weaponKeywords HEAVY.
 *   3. fallback false.
 */
function isModelHeavyArmed(model, factionId) {
  if (!model || !Array.isArray(model.companionEquipment)) return false;
  for (const eq of model.companionEquipment) {
    if (!eq) continue;
    // Inline keywords.
    const inlineKw = eq.weaponKeywords || eq['weapon-keywords'] || [];
    if (Array.isArray(inlineKw) && inlineKw.some(k => /^heavy$/i.test(String(k)))) return true;
    if (inlineKw && typeof inlineKw.has === 'function' && inlineKw.has('HEAVY')) return true;
    // Lookup armoury si tenemos factionId.
    if (factionId && typeof DATA !== 'undefined' && DATA.factions && DATA.factions[factionId]) {
      const armoury = DATA.factions[factionId].armoury || {};
      const name = eq.name || eq['equipment-name'] || '';
      if (!name) continue;
      for (const cat of ['ranged', 'melee', 'grenades']) {
        const list = armoury[cat] || [];
        const entry = list.find(w => w.name === name);
        if (entry && Array.isArray(entry.weaponKeywords) &&
            entry.weaponKeywords.some(k => /^heavy$/i.test(String(k)))) return true;
      }
    }
  }
  return false;
}

/** Sprint 16: cover-seeking advance. Devuelve la mejor celda destino
 * para advance, ponderando progreso hacia el target + cover bonus.
 * Score = (oldDist - newDist) + coverBonus(heavy=2.5, light=1, none=0).
 * Iteración O(budget²) sobre vecindad — budget pequeño (6"), aceptable. */
function _lab2ChooseAdvanceWithCover(state, modelUid, targetUid) {
  if (!state) return null;
  const from = getModelPosition(state, modelUid);
  const to = getModelPosition(state, targetUid);
  const model = _lab2GetModelByUid(state, modelUid);
  if (!from || !to || !model) return null;
  const budget = getModelMoveBudget(model);
  const oldDist = inchesBetween(from, to);
  let best = null, bestScore = -Infinity;
  const r = Math.ceil(budget);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cand = { x: from.x + dx, y: from.y + dy };
      if (cand.x < 0 || cand.y < 0 ||
          cand.x >= state.map.width || cand.y >= state.map.height) continue;
      if (inchesBetween(from, cand) > budget + 0.001) continue;
      if (getCellTerrain(state.map, cand) === 'blocked') continue;
      if (modelAt(state, cand)) continue;
      const newDist = inchesBetween(cand, to);
      const progress = oldDist - newDist;
      const cv = getCellCover(state.map, cand);
      const coverBonus = cv === 'heavy' ? 2.5 : cv === 'light' ? 1 : 0;
      const score = progress + coverBonus;
      if (score > bestScore) { bestScore = score; best = cand; }
    }
  }
  return best;
}

/** Decide la acción del modelo en su turno.
 *
 * Returns: { action: 'shoot'|'advance'|'hold', targetUid?, movePos? }
 *
 *   - 'shoot': hay target en rango + LoS → ataca al elegido.
 *   - 'advance': sin target en rango → muévete hacia el más cercano,
 *      hasta el budget de movimiento (línea recta aproximada).
 *   - 'hold': no hay enemigos en el tablero → quédate quieto.
 *
 * V1 no diferencia ranged/melee. Sprint 4 añade charge cuando el
 * advance llega a 1" del enemigo. */
function chooseActionHeuristic(state, modelUid, rangeInches) {
  if (!state || !modelUid) return { action: 'hold' };
  // Sprint 23: scenario-aware tweaks. state.scenarioId si presente.
  const scenarioId = state.scenarioId || null;
  const _scnSide = _lab2GetSideForUid(state, modelUid);
  const _scnFrom = getModelPosition(state, modelUid);
  // Sprint 30: AI bias enemy. Solo aplica si el modelo es enemy side.
  const _aiStyle = (_scnSide === 'enemy') ? (state.enemyAIStyle || 'balanced') : 'balanced';
  const chargeRange = (_aiStyle === 'aggressive') ? 4.001 : 3.001;
  // Sprint 30 defensive: si shoot está disponible (en rango+LoS), saltar
  // melee/charge en favor de shoot. Calculamos shoot target temprano.
  if (_aiStyle === 'defensive') {
    const _defTgt = chooseTargetHeuristic(state, modelUid, rangeInches);
    if (_defTgt) return { action: 'shoot', targetUid: _defTgt };
  }
  // Sprint 10: prioridad melee si nearest enemy ≤ charge range (canon ~3").
  const nearestForMelee = _lab2NearestEnemy(state, modelUid);
  if (nearestForMelee) {
    const fromM = getModelPosition(state, modelUid);
    const toM = getModelPosition(state, nearestForMelee);
    if (fromM && toM) {
      const dM = inchesBetween(fromM, toM);
      if (dM <= 1.001) {
        return { action: 'melee', targetUid: nearestForMelee };
      }
      if (dM <= chargeRange) {
        // Charge: mueve hasta 1" del target.
        const dx = toM.x - fromM.x, dy = toM.y - fromM.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const step = Math.max(0, dist - 1);
        let nx = Math.round(fromM.x + (dx/dist) * step);
        let ny = Math.round(fromM.y + (dy/dist) * step);
        nx = Math.max(0, Math.min(state.map.width - 1, nx));
        ny = Math.max(0, Math.min(state.map.height - 1, ny));
        return { action: 'charge', targetUid: nearestForMelee, movePos: { x: nx, y: ny } };
      }
    }
  }
  const tgt = chooseTargetHeuristic(state, modelUid, rangeInches);
  if (tgt) return { action: 'shoot', targetUid: tgt };
  // Sprint 23: hold-the-line — si modelo está en su mitad defensiva
  // y no hay enemy en rango, campa (hold) en vez de advance.
  if (scenarioId === 'hold-the-line' && _scnFrom && state.map) {
    const half = state.map.height / 2;
    const inOwnHalf = (_scnSide === 'friendly') ? _scnFrom.y < half : _scnFrom.y >= half;
    if (inOwnHalf) return { action: 'hold' };
  }
  // Sprint 17: HEAVY weapons no pueden moverse Y disparar mismo turno.
  // Si el modelo es heavy y no hay target en rango, hold (no advance).
  const _heavyModel = _lab2GetModelByUid(state, modelUid);
  if (_heavyModel && isModelHeavyArmed(_heavyModel, state.factionId)) {
    return { action: 'hold' };
  }
  // Sprint 23: scenario-aware target geográfico para advance.
  // breakthrough: advance hacia la zona de victoria (y profunda).
  // capture-point: advance hacia el objetivo central (24,16).
  let geoTarget = null;
  if (scenarioId === 'breakthrough' && _scnFrom && state.map) {
    const winY = (_scnSide === 'friendly') ? (state.map.height - 4) : 3;
    geoTarget = { x: _scnFrom.x, y: winY };
  } else if (scenarioId === 'capture-point') {
    geoTarget = { x: 24, y: 16 };
  }
  if (geoTarget) {
    // Crea un pseudo-target uid sintético usando _lab2ChooseAdvanceWithCover
    // sería costoso. Usamos lógica inline: best cell scoring vs geoTarget.
    const _gtModel = _lab2GetModelByUid(state, modelUid);
    if (_scnFrom && _gtModel) {
      const _gtBudget = getModelMoveBudget(_gtModel);
      const _gtOldDist = inchesBetween(_scnFrom, geoTarget);
      const _gtR = Math.ceil(_gtBudget);
      let bestCell = null, bestScore = -Infinity;
      for (let dy = -_gtR; dy <= _gtR; dy++) {
        for (let dx = -_gtR; dx <= _gtR; dx++) {
          if (dx === 0 && dy === 0) continue;
          const cand = { x: _scnFrom.x + dx, y: _scnFrom.y + dy };
          if (cand.x < 0 || cand.y < 0 ||
              cand.x >= state.map.width || cand.y >= state.map.height) continue;
          if (inchesBetween(_scnFrom, cand) > _gtBudget + 0.001) continue;
          if (getCellTerrain(state.map, cand) === 'blocked') continue;
          if (modelAt(state, cand)) continue;
          const newDist = inchesBetween(cand, geoTarget);
          const progress = _gtOldDist - newDist;
          const cv = getCellCover(state.map, cand);
          const coverBonus = cv === 'heavy' ? 2.5 : cv === 'light' ? 1 : 0;
          const score = progress + coverBonus;
          if (score > bestScore) { bestScore = score; bestCell = cand; }
        }
      }
      if (bestCell) {
        return { action: 'advance', movePos: bestCell };
      }
    }
  }
  // Sin target: advance hacia el enemigo más cercano.
  const nearest = _lab2NearestEnemy(state, modelUid);
  if (!nearest) return { action: 'hold' };
  // Sprint 16: prefiere celda con cover en ruta si está disponible.
  const coverCell = _lab2ChooseAdvanceWithCover(state, modelUid, nearest);
  if (coverCell) {
    return { action: 'advance', movePos: coverCell, targetUid: nearest };
  }
  const model = _lab2GetModelByUid(state, modelUid);
  const from = getModelPosition(state, modelUid);
  const to = getModelPosition(state, nearest);
  if (!from || !to) return { action: 'hold' };
  const budget = getModelMoveBudget(model);
  // Vector unitario from→to, escalado por budget.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { action: 'hold' };
  const step = Math.min(budget, dist);
  let nx = Math.round(from.x + (dx / dist) * step);
  let ny = Math.round(from.y + (dy / dist) * step);
  // Clip a bounds del mapa.
  nx = Math.max(0, Math.min(state.map.width - 1, nx));
  ny = Math.max(0, Math.min(state.map.height - 1, ny));
  // Si la celda está blocked o ocupada, intenta una celda cercana.
  let movePos = { x: nx, y: ny };
  if (getCellTerrain(state.map, movePos) === 'blocked' || modelAt(state, movePos)) {
    // Fallback: escanea radio 2 en torno a la propuesta.
    let found = null;
    for (let r = 1; r <= 3 && !found; r++) {
      for (let oy = -r; oy <= r && !found; oy++) {
        for (let ox = -r; ox <= r && !found; ox++) {
          const cand = { x: nx + ox, y: ny + oy };
          if (cand.x < 0 || cand.y < 0 || cand.x >= state.map.width || cand.y >= state.map.height) continue;
          if (inchesBetween(from, cand) > budget + 0.001) continue;
          if (getCellTerrain(state.map, cand) === 'blocked') continue;
          if (modelAt(state, cand)) continue;
          found = cand;
        }
      }
    }
    if (found) movePos = found;
    else return { action: 'hold' };  // no hay celda viable.
  }
  return { action: 'advance', movePos, targetUid: nearest };
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 4 — Sim loop espacial completo.
   ----------------------------------------------------------------------
 * Sobre Sprints 1-3 (mapas, estado, IA), añade:
 *  - markModelOut: KO tracking + limpieza de posición.
 *  - rollSpatialAttack: resolver ranged abstracto con cover modifier.
 *  - simulateBattleSpatial: bucle de activación alternada hasta OoA o maxTurns.
 *
 * V1 limitaciones documentadas (a refinar en Sprint 5):
 *  - Solo ranged. No melee, no charge.
 *  - Modelo de daño aproximado (no canon engine completo). Hit chance
 *    ≈ 0.55 base + 0.10×rangedDice. Cover light -0.15, heavy -0.30.
 *    KO-per-hit ≈ 0.40. Sprint 5 integrará resolveRanged_lab del Lab
 *    abstracto para canon-completo.
 *  - IA enemy idéntica a friendly (chooseActionHeuristic). No diferentes
 *    perfiles tácticos por facción.
 */

/** Marca el modelo como OoA y limpia su posición del tablero. Idempotente. */
function markModelOut(state, uid) {
  if (!state || !uid) return false;
  const model = _lab2GetModelByUid(state, uid);
  if (!model) return false;
  model.isOut = true;
  if (state.friendly.positions[uid]) delete state.friendly.positions[uid];
  if (state.enemy.positions[uid])    delete state.enemy.positions[uid];
  return true;
}

function _parseDiceStat(stat) {
  if (stat == null) return 0;
  const m = String(stat).match(/(-?\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Resuelve un ataque ranged abstracto. NO usa el canon engine completo;
 * V1 es aproximación para validar el sim loop. Sprint 5 hará la swap.
 *
 * Modelo:
 *  - hitChance = 0.55 + 0.10 × rangedDice + coverModifier (clamp [0.05, 0.95]).
 *  - cover modifier por celda del target: light -0.15, heavy -0.30, none 0.
 *  - ko-per-hit ≈ 0.40 (canon ~equivalente tras armour saves típicas).
 *
 * Returns: { hit, ko, hitChance }. */
function rollSpatialAttack(state, attackerUid, targetUid, opts) {
  opts = opts || {};
  const rng = opts.rng || Math.random;
  const attacker = _lab2GetModelByUid(state, attackerUid);
  const target = _lab2GetModelByUid(state, targetUid);
  if (!attacker || !target) return { hit: false, ko: false, hitChance: 0 };
  const targetPos = getModelPosition(state, targetUid);
  if (!targetPos) return { hit: false, ko: false, hitChance: 0 };

  const rangedDice = _parseDiceStat(attacker.companionStats && attacker.companionStats.ranged);
  let hitChance = 0.55 + 0.10 * rangedDice;
  const cover = getCellCover(state.map, targetPos);
  if (cover === 'light') hitChance -= 0.15;
  else if (cover === 'heavy') hitChance -= 0.30;
  // Sprint 25: bonus por glory items (proxy buffs en mesa).
  hitChance += gloryHitBonus(attacker, state.factionId);
  // Clamp.
  if (hitChance < 0.05) hitChance = 0.05;
  if (hitChance > 0.95) hitChance = 0.95;

  const rollHit = rng();
  const hit = rollHit < hitChance;
  let ko = false;
  let splashKOs = [];
  if (hit) {
    const rollKo = rng();
    ko = rollKo < 0.40;
    // Sprint 24: REGENERATE save proc también en ranged.
    if (ko && modelTriesRegenerate(target, rng)) ko = false;
    // Sprint 27: BLAST splash. Detecta BLAST en alguna weapon ranged
    // del attacker (primera con BLAST radius > 0).
    const eq = attacker.companionEquipment || [];
    for (const item of eq) {
      const r = parseBlastRadius(item, state.factionId);
      if (r > 0) {
        splashKOs = applyBlastSplash(state, attackerUid, r, targetUid, rng);
        break;
      }
    }
    // Sprint 28: FIRE persistente. Si weapon tiene FIRE keyword, marca
    // la celda del target con fire durante 2 turnos.
    for (const item of eq) {
      if (hasWeaponKeyword({ companionEquipment: [item] }, 'FIRE', state.factionId)) {
        markFireCell(state, targetPos, 2);
        break;
      }
    }
  }
  return { hit, ko, hitChance, splashKOs };
}

/** Resuelve melee abstracto V1. Análogo a rollSpatialAttack para ranged.
 * hitChance = 0.55 + 0.10 × meleeDice + (charged ? 0.10 : 0). ko-per-hit
 * 0.45 (canon melee suele resolver más letal que ranged). */
function rollSpatialMelee(state, attackerUid, targetUid, opts) {
  opts = opts || {};
  const rng = opts.rng || Math.random;
  const attacker = _lab2GetModelByUid(state, attackerUid);
  const target = _lab2GetModelByUid(state, targetUid);
  if (!attacker || !target) return { hit: false, ko: false, hitChance: 0 };
  const meleeDice = _parseDiceStat(attacker.companionStats && attacker.companionStats.melee);
  let hitChance = 0.55 + 0.10 * meleeDice;
  if (opts.charged) hitChance += 0.10;  // Charge bonus canon.
  // Sprint 25: bonus por glory items (proxy buffs en mesa).
  hitChance += gloryHitBonus(attacker, state.factionId);
  if (hitChance < 0.05) hitChance = 0.05;
  if (hitChance > 0.95) hitChance = 0.95;
  const rollHit = rng();
  const hit = rollHit < hitChance;
  let ko = false;
  let cleaveKOs = [];
  if (hit) {
    const rollKo = rng();
    ko = rollKo < 0.45;
    // Sprint 24: REGENERATE save proc.
    if (ko && modelTriesRegenerate(target, rng)) {
      ko = false;  // saved by REGENERATE.
    }
    // Sprint 24: CLEAVE secundario. Si attacker tiene CLEAVE en arma melee
    // activa, 50% chance de afectar un enemy adyacente al target (≤2").
    if (hasWeaponKeyword(attacker, 'CLEAVE', state.factionId) && rng() < 0.50) {
      const targetPos = getModelPosition(state, targetUid);
      const tSide = _lab2GetSideForUid(state, targetUid);
      if (targetPos && tSide) {
        const positions = state[tSide].positions;
        for (const sUid of Object.keys(positions)) {
          if (sUid === targetUid) continue;
          const sPos = positions[sUid];
          if (inchesBetween(targetPos, sPos) <= 2.001) {
            // Aplica KO directo con 40% (canon CLEAVE más letal porque viene
            // como secundario "free attack" del original).
            if (rng() < 0.40) {
              const sModel = _lab2GetModelByUid(state, sUid);
              if (!modelTriesRegenerate(sModel, rng)) {
                cleaveKOs.push(sUid);
                markModelOut(state, sUid);
              }
            }
            break;  // V1 solo 1 cleave secundario.
          }
        }
      }
    }
  }
  return { hit, ko, hitChance, cleaveKOs };
}

function _lab2AliveModels(state, side) {
  return state[side].models.filter(m => !m.isOut && state[side].positions[m.uid]);
}

function _lab2BuildActivationOrder(state) {
  // Alternancia canon TC: tras initiative roll, A activa 1 modelo, luego B,
  // luego A, etc. V1 simplificación: friendly siempre arranca; la varianza
  // estadística sale del rng y el deployment, no del initiative.
  const friendly = _lab2AliveModels(state, 'friendly').map(m => ({ uid: m.uid, side: 'friendly' }));
  const enemy    = _lab2AliveModels(state, 'enemy').map(m => ({ uid: m.uid, side: 'enemy' }));
  const order = [];
  const max = Math.max(friendly.length, enemy.length);
  for (let i = 0; i < max; i++) {
    if (i < friendly.length) order.push(friendly[i]);
    if (i < enemy.length)    order.push(enemy[i]);
  }
  return order;
}

/** Bucle de simulación espacial. Cada turno:
 *  1. Construye orden de activación alternado side A → B → A → B...
 *  2. Para cada modelo vivo en orden: chooseActionHeuristic → ejecuta.
 *  3. Verifica fin: side completo OoA → ese side pierde.
 *  4. Si llega a maxTurns, winner por survivors (más vivos gana, empate → draw).
 *
 * opts: { rng?: ()=>number, maxTurns?: number=20, rangeInches?: number=24 }
 *
 * Returns: { winner:'friendly'|'enemy'|'draw', turns, friendlyKO, enemyKO }. */
function simulateBattleSpatial(state, opts) {
  opts = opts || {};
  const rng = opts.rng || Math.random;
  const maxTurns = opts.maxTurns || 20;
  const rangeInches = opts.rangeInches || 24;
  const totalFriendly = state.friendly.models.length;
  const totalEnemy = state.enemy.models.length;
  // Sprint 23: copia scenarioId al state para que chooseActionHeuristic
  // pueda consultarlo sin recibirlo cada call.
  if (opts.scenarioId) state.scenarioId = opts.scenarioId;
  // Sprint 20: per-turn tracking opcional (también activado siempre si
  // viene de runBattleSeriesSpatial; el caller controla).
  const perTurn = { friendly: [totalFriendly], enemy: [totalEnemy] };
  function _captureTurn() {
    perTurn.friendly.push(_lab2AliveModels(state, 'friendly').length);
    perTurn.enemy.push(_lab2AliveModels(state, 'enemy').length);
  }
  // Sprint 19: scenario check inicial (turn 0) — si las posiciones de
  // deploy ya satisfacen la condición de victoria, el side gana sin
  // disparar un tiro.
  const initialCheck = _lab2CheckScenarioEnd(state, opts.scenarioId, 0,
                                              maxTurns, totalFriendly, totalEnemy);
  if (initialCheck) return initialCheck;
  let turn = 0;
  while (turn < maxTurns) {
    turn++;
    state.turn = turn;
    state.activated = new Set();
    // Sprint 28: FIRE damage al inicio del turno (modelos en fire cells).
    if (state.fireCells && state.fireCells.size > 0) {
      const fireKOs = processFireDamage(state, rng);
      if (fireKOs.length > 0 && opts.recorder && opts.recorder.onEvent) {
        for (const koUid of fireKOs) {
          opts.recorder.onEvent({ type: 'fire-ko', uid: koUid });
        }
      }
      tickFireCells(state);
    }
    const order = _lab2BuildActivationOrder(state);
    for (const { uid } of order) {
      const model = _lab2GetModelByUid(state, uid);
      if (!model || model.isOut) continue;
      if (opts.recorder && opts.recorder.onEvent) {
        // Sprint 15: emite activation-start para que el replay pueda
        // resaltar el modelo activo (orden alternado canon TC).
        opts.recorder.onEvent({ type: 'activation-start', uid });
      }
      const action = chooseActionHeuristic(state, uid, rangeInches);
      if (action.action === 'shoot' && action.targetUid) {
        // Verifica LoS justo antes (target puede haberse movido).
        if (!hasLineOfSightBetween(state, uid, action.targetUid)) continue;
        // Sprint 29: AUTOMATIC X — múltiples ataques por activación.
        const attackerModel = _lab2GetModelByUid(state, uid);
        let autoCount = 1;
        if (attackerModel && attackerModel.companionEquipment) {
          for (const item of attackerModel.companionEquipment) {
            const c = parseAutomaticCount(item, state.factionId);
            if (c > autoCount) autoCount = c;
          }
        }
        let result = null;
        for (let ai = 0; ai < autoCount; ai++) {
          const tgtModel = _lab2GetModelByUid(state, action.targetUid);
          if (!tgtModel || tgtModel.isOut) break;
          result = opts.useCanonEngine
            ? rollSpatialAttackCanon(state, uid, action.targetUid, { rng, factionId: opts.factionId })
            : rollSpatialAttack(state, uid, action.targetUid, { rng });
          if (result.ko) break;  // target down, stop more attacks.
        }
        if (opts.recorder && opts.recorder.onEvent) {
          opts.recorder.onEvent({
            type: 'shoot', attackerUid: uid, targetUid: action.targetUid,
            hit: result.hit, ko: result.ko, hitChance: result.hitChance,
          });
        }
        if (result.ko) {
          markModelOut(state, action.targetUid);
          if (opts.recorder && opts.recorder.onEvent) {
            opts.recorder.onEvent({ type: 'ko', uid: action.targetUid });
          }
        }
      } else if (action.action === 'advance' && action.movePos) {
        const from = getModelPosition(state, uid);
        moveModel(state, uid, action.movePos);
        if (opts.recorder && opts.recorder.onEvent) {
          opts.recorder.onEvent({
            type: 'move', uid,
            from: { x: from.x, y: from.y },
            to: { x: action.movePos.x, y: action.movePos.y },
          });
        }
      } else if (action.action === 'charge' && action.targetUid) {
        // Sprint 10 + 14: charge = mover hasta 1" del target + melee con +bonus.
        if (action.movePos) moveModel(state, uid, action.movePos);
        const result = opts.useCanonEngine
          ? rollSpatialMeleeCanon(state, uid, action.targetUid, { rng, charged: true, factionId: opts.factionId })
          : rollSpatialMelee(state, uid, action.targetUid, { rng, charged: true });
        if (opts.recorder && opts.recorder.onEvent) {
          opts.recorder.onEvent({
            type: 'charge', attackerUid: uid, targetUid: action.targetUid,
            hit: result.hit, ko: result.ko,
          });
        }
        if (result.ko) {
          markModelOut(state, action.targetUid);
          if (opts.recorder && opts.recorder.onEvent) {
            opts.recorder.onEvent({ type: 'ko', uid: action.targetUid });
          }
        }
      } else if (action.action === 'melee' && action.targetUid) {
        const result = opts.useCanonEngine
          ? rollSpatialMeleeCanon(state, uid, action.targetUid, { rng, charged: false, factionId: opts.factionId })
          : rollSpatialMelee(state, uid, action.targetUid, { rng, charged: false });
        if (opts.recorder && opts.recorder.onEvent) {
          opts.recorder.onEvent({
            type: 'melee', attackerUid: uid, targetUid: action.targetUid,
            hit: result.hit, ko: result.ko,
          });
        }
        if (result.ko) {
          markModelOut(state, action.targetUid);
          if (opts.recorder && opts.recorder.onEvent) {
            opts.recorder.onEvent({ type: 'ko', uid: action.targetUid });
          }
        }
      }
      state.activated.add(uid);
    }
    if (opts.recorder && opts.recorder.onTurnEnd) {
      opts.recorder.onTurnEnd(turn, state);
    }
    // Sprint 20: captura per-turn antes de devolver (asegura punto final
    // incluso si el turno acabó por wipeout/scenario).
    _captureTurn();
    // Fin de turno: scenario objective primero (Sprint 19), luego wipeout.
    const scenarioEnd = _lab2CheckScenarioEnd(state, opts.scenarioId, turn,
                                              maxTurns, totalFriendly, totalEnemy);
    if (scenarioEnd) {
      if (opts.trackPerTurn) scenarioEnd.perTurn = perTurn;
      return scenarioEnd;
    }
    const aliveF = _lab2AliveModels(state, 'friendly').length;
    const aliveE = _lab2AliveModels(state, 'enemy').length;
    if (aliveF === 0 && aliveE === 0) {
      return Object.assign({ winner: 'draw', turns: turn,
                              friendlyKO: totalFriendly, enemyKO: totalEnemy },
                            opts.trackPerTurn ? { perTurn } : {});
    }
    if (aliveF === 0) {
      return Object.assign({ winner: 'enemy', turns: turn,
                              friendlyKO: totalFriendly, enemyKO: totalEnemy - aliveE },
                            opts.trackPerTurn ? { perTurn } : {});
    }
    if (aliveE === 0) {
      return Object.assign({ winner: 'friendly', turns: turn,
                              friendlyKO: totalFriendly - aliveF, enemyKO: totalEnemy },
                            opts.trackPerTurn ? { perTurn } : {});
    }
  }
  // maxTurns reach: scenario-specific tiebreaker.
  if (opts.scenarioId === 'hold-the-line') {
    const r = _lab2HoldTheLineWinner(state, totalFriendly, totalEnemy, turn);
    if (opts.trackPerTurn) r.perTurn = perTurn;
    return r;
  }
  // Default: winner por survivors.
  const aliveF = _lab2AliveModels(state, 'friendly').length;
  const aliveE = _lab2AliveModels(state, 'enemy').length;
  let winner = 'draw';
  if (aliveF > aliveE) winner = 'friendly';
  else if (aliveE > aliveF) winner = 'enemy';
  return Object.assign({ winner, turns: turn,
                          friendlyKO: totalFriendly - aliveF, enemyKO: totalEnemy - aliveE },
                        opts.trackPerTurn ? { perTurn } : {});
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 5 — Estadísticas agregadas sobre N batallas.
   ----------------------------------------------------------------------
 * Construye sobre el sim loop (Sprint 4). Para análisis cuantitativo:
 * corre N batallas con configuración idéntica y agrega resultados.
 *
 * Pattern equivalente a runBattleSeries_lab del Lab abstracto, pero
 * con conciencia espacial: cada batalla incluye deployment heurístico,
 * activación alternada, advance/shoot con LoS/cover/range.
 *
 * Los modelos de input NO se mutan: cada batalla parte de un clon
 * profundo (vía structuredClone si está, fallback JSON parse).
 */

function _deepCloneModel(m) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(m); } catch (e) { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(m));
}

/** Corre N batallas con la misma configuración de bandas + mapa, agrega
 * resultados. Cada batalla:
 *   1. Clone profundo de friendlyModels + enemyModels.
 *   2. createLab2Battle con los clones.
 *   3. deployBandHeuristic en ambos sides.
 *   4. simulateBattleSpatial.
 *   5. Acumula winner + turns + KOs.
 *
 * opts: {
 *   friendlyModels: [...], enemyModels: [...], mapId,
 *   nBattles=100, maxTurns=20, rangeInches=24, rng?
 * }
 *
 * Returns: { nBattles, winRateFriendly, winRateEnemy, drawRate,
 *            avgTurns, avgFriendlyKO, avgEnemyKO, mapId,
 *            friendlyCount, enemyCount }. */
function runBattleSeriesSpatial(opts) {
  opts = opts || {};
  const friendlyModels = opts.friendlyModels || [];
  const enemyModels    = opts.enemyModels    || [];
  const mapId          = opts.mapId || 'open-ground';
  const nBattles       = opts.nBattles  || 100;
  const maxTurns       = opts.maxTurns  || 20;
  const rangeInches    = opts.rangeInches || 24;
  const rng            = opts.rng || Math.random;

  let winF = 0, winE = 0, draw = 0;
  let sumTurns = 0, sumKoF = 0, sumKoE = 0;
  // Sprint 20: per-turn aggregate. Acumula sum per (turn, side) y count
  // por turno (algunos batallas terminan antes que otras).
  const perTurnSumF = [], perTurnSumE = [], perTurnCount = [];
  for (let i = 0; i < nBattles; i++) {
    const fClones = friendlyModels.map(_deepCloneModel);
    const eClones = enemyModels.map(_deepCloneModel);
    const state = createLab2Battle(mapId, fClones, eClones);
    deployBandHeuristic(state, 'friendly');
    deployBandHeuristic(state, 'enemy');
    const simOpts = Object.assign({}, opts, {
      rng, maxTurns, rangeInches, trackPerTurn: true,
    });
    const r = simulateBattleSpatial(state, simOpts);
    if (r.winner === 'friendly') winF++;
    else if (r.winner === 'enemy') winE++;
    else draw++;
    sumTurns += r.turns;
    sumKoF += r.friendlyKO;
    sumKoE += r.enemyKO;
    // Acumula perTurn de esta batalla. Length variable según wipeout.
    if (r.perTurn) {
      for (let t = 0; t < r.perTurn.friendly.length; t++) {
        perTurnSumF[t] = (perTurnSumF[t] || 0) + r.perTurn.friendly[t];
        perTurnSumE[t] = (perTurnSumE[t] || 0) + r.perTurn.enemy[t];
        perTurnCount[t] = (perTurnCount[t] || 0) + 1;
      }
    }
  }
  const avgAlivePerTurn = {
    friendly: perTurnSumF.map((s, t) => s / Math.max(1, perTurnCount[t])),
    enemy:    perTurnSumE.map((s, t) => s / Math.max(1, perTurnCount[t])),
  };
  return {
    nBattles,
    winRateFriendly: winF / nBattles,
    winRateEnemy:    winE / nBattles,
    drawRate:        draw / nBattles,
    avgTurns:        sumTurns / nBattles,
    avgFriendlyKO:   sumKoF / nBattles,
    avgEnemyKO:      sumKoE / nBattles,
    avgAlivePerTurn,
    mapId,
    friendlyCount:   friendlyModels.length,
    enemyCount:      enemyModels.length,
  };
}

/** Sprint 20: line chart simple en canvas 2D. Pinta 2 líneas (friendly
 * dorado, enemy rojo) sobre eje X=turno, eje Y=alive count.
 *
 * opts: { width=400, height=250, padding=30 }. */
function renderStatsGraph(ctx, perTurnStats, opts) {
  if (!ctx || !perTurnStats) return;
  opts = opts || {};
  const W = opts.width || (ctx.canvas && ctx.canvas.width) || 400;
  const H = opts.height || (ctx.canvas && ctx.canvas.height) || 250;
  const PAD = opts.padding || 30;
  const C = (typeof LAB2_REPLAY_COLORS !== 'undefined') ? LAB2_REPLAY_COLORS : {
    friendlyFill:'#c9a961', enemyFill:'#9b1e1e', text:'#1a1410', gridLine:'#7f6b43',
  };
  // Background.
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, W, H);
  // Bounds + axis.
  const f = perTurnStats.friendly || [];
  const e = perTurnStats.enemy || [];
  if (f.length === 0 && e.length === 0) {
    ctx.fillStyle = C.text;
    ctx.font = '12px sans-serif';
    ctx.fillText('Sin datos.', PAD, H / 2);
    return;
  }
  const nPoints = Math.max(f.length, e.length);
  const maxY = Math.max(1, ...f, ...e);
  const xScale = (W - 2 * PAD) / Math.max(1, nPoints - 1);
  const yScale = (H - 2 * PAD) / maxY;
  // Grid lines (eje X).
  ctx.strokeStyle = C.gridLine;
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= maxY; y++) {
    const py = H - PAD - y * yScale;
    ctx.beginPath();
    ctx.moveTo(PAD, py);
    ctx.lineTo(W - PAD, py);
    ctx.stroke();
  }
  // Friendly line.
  ctx.strokeStyle = C.friendlyFill;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < f.length; i++) {
    const px = PAD + i * xScale;
    const py = H - PAD - f[i] * yScale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // Enemy line.
  ctx.strokeStyle = C.enemyFill;
  ctx.beginPath();
  for (let i = 0; i < e.length; i++) {
    const px = PAD + i * xScale;
    const py = H - PAD - e[i] * yScale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // Labels.
  ctx.fillStyle = C.text || '#e8d4a8';
  ctx.font = '11px sans-serif';
  ctx.fillText('Turno', W / 2 - 20, H - 8);
  ctx.fillText('Alive', 4, PAD - 8);
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 7 — Integración canon engine (resolveRanged_lab).
   ----------------------------------------------------------------------
 * Sobre Sprints 1-6: opcionalmente reemplaza el modelo abstracto V1 de
 * daño (hit = 0.55 + 0.10×dice + cover modifier) por el motor canon del
 * Lab abstracto (resolveRanged_lab + applyInjury_lab), que ya implementa
 * canon TC: armour saves, BLAST, FIRE, AUTOMATIC X, IGNORE COVER, Aim,
 * Marksmanship, Siege Jezzail Teams, blessings, RISKY, etc.
 *
 * Toggle via opts.useCanonEngine en simulateBattleSpatial. Default false
 * para back-compat (Sprints 4-6 siguen produciendo resultados idénticos).
 *
 * Cover en canon engine: en lugar de la probabilística applyTerrainCoverModifier
 * (open=10%, mixed=30%, urban=50%) del Lab abstracto — útil cuando no hay
 * posiciones — Lab 2.0 conoce la celda del target. Aplicamos cover
 * deterministic baking -1/-2 dice en weapon.diceMod + IGNORE COVER en
 * weapon.keywords para anular el aplicador probabilístico.
 */

function _lab2ParseDice(stat) {
  if (stat == null) return 0;
  const m = String(stat).match(/(-?\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Adapter companion-shape → abstract Lab shape.
 * Genera id, dice stats parseados, keywords:Set, flags derivados desde
 * keywords (tough, strong, negateFear, etc.), _pos del Lab espacial.
 *
 * weapons[] se inicializa vacío — el caller añade vía _lab2ToAbstractWeapon
 * sólo el arma relevante al ataque actual (resolveRanged_lab no necesita
 * todas las armas del modelo). */
function _lab2ToAbstractModel(model, pos) {
  if (!model) return null;
  const stats = model.companionStats || {};
  const kws = new Set();
  for (const k of (model.companionKeywords || [])) {
    const name = typeof k === 'string' ? k : (k && k.name) || '';
    if (name) kws.add(name);
  }
  return {
    id: model.uid,
    name: model.name || 'X',
    cost: model.companionCost || 0,
    meleeDice:  _lab2ParseDice(stats.melee),
    rangedDice: _lab2ParseDice(stats.ranged),
    armour:     _lab2ParseDice(stats.armour),
    weapons: [],
    keywords: kws,
    bloodMarkers: 0,
    isDown: false,
    isOut: !!model.isOut,
    _pos: pos ? { x: pos.x, y: pos.y } : null,
    _terrain: 'open',  // Cover lo aplicamos baked-in en weapon.
    tough:       kws.has('TOUGH'),
    strong:      kws.has('STRONG'),
    negateFear:  kws.has('NEGATE FEAR'),
    negateHeavy: kws.has('NEGATE HEAVY'),
    elite:       kws.has('ELITE'),
    leader:      kws.has('LEADER'),
  };
}

/** Adapter companion equipment item → abstract Lab weapon shape.
 * Mira DATA.factions[factionId].armoury.{ranged,melee,grenades} para
 * pillar entry canónica. Parsea weaponKeywords típicos:
 *   '+1 DICE' → diceMod += 1
 *   '+N INJURY DICE' → injuryDice += N
 *   '+N INJURY MODIFIER' → injuryMod += N
 * Devuelve fallback minimal si no hay entry.  */
function _lab2ToAbstractWeapon(eqItem, factionId) {
  if (!eqItem) return null;
  const name = eqItem.name || eqItem['equipment-name'] || '';
  if (!name) return null;
  const armoury = (typeof DATA !== 'undefined' && DATA.factions && DATA.factions[factionId] && DATA.factions[factionId].armoury) || {};
  let entry = null;
  for (const cat of ['ranged', 'melee', 'grenades']) {
    const list = armoury[cat] || [];
    const found = list.find(w => w.name === name);
    if (found) { entry = found; break; }
  }
  if (!entry) {
    return {
      name, isRanged: true, range: 24, diceMod: 0,
      injuryDice: 0, injuryMod: 0, keywords: new Set(),
    };
  }
  const isRanged = !/Melee/i.test(entry.range || '');
  const kws = new Set(entry.weaponKeywords || []);
  let diceMod = 0, injuryDice = 0, injuryMod = 0;
  for (const k of kws) {
    let m = k.match(/^([+-]?\d+)\s+INJURY\s+DICE/i);
    if (m) injuryDice += parseInt(m[1], 10);
    m = k.match(/^([+-]?\d+)\s+INJURY\s+MODIFIER/i);
    if (m) injuryMod += parseInt(m[1], 10);
    m = k.match(/^([+-]?\d+)\s+DICE\s*$/i);
    if (m) diceMod += parseInt(m[1], 10);
  }
  return {
    name, isRanged,
    range: entry.range || '24"',
    diceMod, injuryDice, injuryMod,
    keywords: kws,
    // Flags de reglas especiales del arma (datos de la armería).
    critIgnoreArmour: !!entry.critIgnoreArmour,
    shortRangeInjuryDice: entry.shortRangeInjuryDice || 0,
    unnaturalInversion: !!entry.unnaturalInversion,
  };
}

/** Resuelve ranged attack usando el canon engine (resolveRanged_lab).
 * Equivalente canon-correct de rollSpatialAttack del Sprint 4.
 *
 * Cover: aplica deterministic por celda del target (light -1 dice,
 * heavy -2 dice) baking-in en weapon.diceMod + añade IGNORE COVER a
 * weapon.keywords para anular la prob de applyTerrainCoverModifier
 * (que es para Lab abstracto sin posiciones).
 *
 * Math.random swap: si opts.rng se provee, swap temporal durante la
 * llamada a resolveRanged_lab para mantener tests deterministas.
 *
 * Returns: { hit, ko }. */
function rollSpatialAttackCanon(state, attackerUid, targetUid, opts) {
  opts = opts || {};
  const aModel = _lab2GetModelByUid(state, attackerUid);
  const tModel = _lab2GetModelByUid(state, targetUid);
  if (!aModel || !tModel) return { hit: false, ko: false };
  const aPos = getModelPosition(state, attackerUid);
  const tPos = getModelPosition(state, targetUid);
  if (!aPos || !tPos) return { hit: false, ko: false };

  const factionId = opts.factionId || state.factionId
    || (state.friendly.models[0] && state.friendly.models[0].factionId)
    || 'new-antioch';

  const absA = _lab2ToAbstractModel(aModel, aPos);
  const absT = _lab2ToAbstractModel(tModel, tPos);

  // Identifica arma ranged del attacker. V1 toma la primera ranged en
  // companionEquipment; canon refinement futuro: elegir según range vs distancia.
  const eq = aModel.companionEquipment || [];
  const rangedItem = eq.find(e => {
    const t = (e.type || e['equipment-type'] || '').toLowerCase();
    return t.includes('ranged') || (t.includes('weapon') && !t.includes('melee'));
  });
  let weapon = rangedItem
    ? _lab2ToAbstractWeapon(rangedItem, factionId)
    : null;
  if (!weapon) {
    // Fallback: arma genérica con stats del modelo (sin equipment ranged).
    weapon = {
      name: 'Service Rifle', isRanged: true, range: 24, diceMod: 0,
      injuryDice: 0, injuryMod: 0, keywords: new Set(),
    };
  }

  // Cover deterministic: aplica diff de dice + IGNORE COVER para anular
  // el aplicador probabilístico del canon engine.
  const cover = getCellCover(state.map, tPos);
  const coverDice = cover === 'heavy' ? -2 : cover === 'light' ? -1 : 0;
  const weaponCopy = Object.assign({}, weapon, {
    diceMod: weapon.diceMod + coverDice,
    keywords: new Set(weapon.keywords),
  });
  weaponCopy.keywords.add('IGNORE COVER');

  const initBlood = absT.bloodMarkers;
  const initOut = absT.isOut;
  const origRandom = Math.random;
  if (opts.rng) Math.random = opts.rng;
  try {
    resolveRanged_lab(absA, absT, weaponCopy, [absT]);
  } catch (e) {
    Math.random = origRandom;
    return { hit: false, ko: false, error: e.message };
  }
  Math.random = origRandom;

  const hit = (absT.isOut !== initOut) || (absT.bloodMarkers !== initBlood);
  const ko = absT.isOut && !initOut;
  if (ko) markModelOut(state, targetUid);
  return { hit, ko };
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 19 — Scenario objectives (alternative win conditions).
   ----------------------------------------------------------------------
 * Canon TC tiene escenarios con condiciones de victoria distintas a
 * wipeout. V1 spatial añade 3 además del default:
 *  - 'pitched-battle': wipeout. Comportamiento back-compat.
 *  - 'breakthrough': friendly gana si CUALQUIER alive llega y ≥ height-4.
 *  - 'hold-the-line': tras maxTurns, gana side con MÁS modelos en su mitad.
 *  - 'capture-point': control de (24,16). Si UN side tiene modelos a ≤3"
 *    del objetivo y el otro 0, gana al fin del turno.
 */
const LAB2_SCENARIOS = {
  'pitched-battle': {
    name: 'Pitched Battle',
    description: 'Estándar: gana el último side con modelos vivos.',
  },
  'breakthrough': {
    name: 'Breakthrough',
    description: 'Friendly gana si llega a la zona profunda del enemy (y ≥ 28).',
  },
  'hold-the-line': {
    name: 'Hold the Line',
    description: 'Tras maxTurns, gana el side con más modelos en su mitad defensiva.',
  },
  'capture-point': {
    name: 'Capture Point',
    description: 'Objetivo en (24,16). Control exclusivo a 3" = victoria.',
  },
};

function _lab2CheckScenarioEnd(state, scenarioId, turn, maxTurns, totalF, totalE) {
  if (!scenarioId || scenarioId === 'pitched-battle') return null;
  const aliveF = _lab2AliveModels(state, 'friendly');
  const aliveE = _lab2AliveModels(state, 'enemy');
  if (scenarioId === 'breakthrough') {
    // Friendly gana si alguien llegó a zona profunda (y ≥ height-4).
    const winY = state.map.height - 4;
    for (const m of aliveF) {
      const p = state.friendly.positions[m.uid];
      if (p && p.y >= winY) {
        return { winner: 'friendly', turns: turn,
                 friendlyKO: totalF - aliveF.length, enemyKO: totalE - aliveE.length };
      }
    }
    // Mirror enemy: y ≤ 3.
    const enemyWinY = 3;
    for (const m of aliveE) {
      const p = state.enemy.positions[m.uid];
      if (p && p.y <= enemyWinY) {
        return { winner: 'enemy', turns: turn,
                 friendlyKO: totalF - aliveF.length, enemyKO: totalE - aliveE.length };
      }
    }
  } else if (scenarioId === 'capture-point') {
    const obj = { x: 24, y: 16 };
    const fNear = aliveF.filter(m => {
      const p = state.friendly.positions[m.uid];
      return p && inchesBetween(p, obj) <= 3.001;
    }).length;
    const eNear = aliveE.filter(m => {
      const p = state.enemy.positions[m.uid];
      return p && inchesBetween(p, obj) <= 3.001;
    }).length;
    if (fNear > 0 && eNear === 0) {
      return { winner: 'friendly', turns: turn,
               friendlyKO: totalF - aliveF.length, enemyKO: totalE - aliveE.length };
    }
    if (eNear > 0 && fNear === 0) {
      return { winner: 'enemy', turns: turn,
               friendlyKO: totalF - aliveF.length, enemyKO: totalE - aliveE.length };
    }
  }
  // 'hold-the-line' se evalúa solo al hit maxTurns; no termina antes.
  return null;
}

function _lab2HoldTheLineWinner(state, totalF, totalE, turn) {
  const aliveF = _lab2AliveModels(state, 'friendly');
  const aliveE = _lab2AliveModels(state, 'enemy');
  const half = state.map.height / 2;
  const fHoldCount = aliveF.filter(m => {
    const p = state.friendly.positions[m.uid];
    return p && p.y < half;
  }).length;
  const eHoldCount = aliveE.filter(m => {
    const p = state.enemy.positions[m.uid];
    return p && p.y >= half;
  }).length;
  let winner = 'draw';
  if (fHoldCount > eHoldCount) winner = 'friendly';
  else if (eHoldCount > fHoldCount) winner = 'enemy';
  return { winner, turns: turn,
           friendlyKO: totalF - aliveF.length, enemyKO: totalE - aliveE.length };
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 14 — Canon engine para melee (resolveMelee_lab).
   ----------------------------------------------------------------------
 * Análogo a Sprint 7 (rollSpatialAttackCanon ranged). Cuando opts.useCanonEngine
 * y la action es 'charge' o 'melee', delega en resolveMelee_lab del Lab
 * abstracto en vez del modelo aproximado rollSpatialMelee.
 *
 * Reaprovecha _lab2ToAbstractModel + _lab2ToAbstractWeapon del Sprint 7.
 */
function rollSpatialMeleeCanon(state, attackerUid, targetUid, opts) {
  opts = opts || {};
  const aModel = _lab2GetModelByUid(state, attackerUid);
  const tModel = _lab2GetModelByUid(state, targetUid);
  if (!aModel || !tModel) return { hit: false, ko: false };
  const aPos = getModelPosition(state, attackerUid);
  const tPos = getModelPosition(state, targetUid);
  if (!aPos || !tPos) return { hit: false, ko: false };
  const factionId = opts.factionId || state.factionId
    || (state.friendly.models[0] && state.friendly.models[0].factionId)
    || 'new-antioch';

  const absA = _lab2ToAbstractModel(aModel, aPos);
  const absT = _lab2ToAbstractModel(tModel, tPos);

  // Identifica arma melee del attacker. V1 toma la primera en companionEquipment.
  const eq = aModel.companionEquipment || [];
  const meleeItem = eq.find(e => {
    const t = (e.type || e['equipment-type'] || '').toLowerCase();
    return t.includes('melee');
  });
  let weapon = meleeItem ? _lab2ToAbstractWeapon(meleeItem, factionId) : null;
  if (!weapon) {
    // Fallback: arma natural (unarmed melee 0 stats).
    weapon = {
      name: 'Unarmed', isRanged: false, range: 'Melee', diceMod: 0,
      injuryDice: 0, injuryMod: 0, keywords: new Set(),
    };
  }

  const initBlood = absT.bloodMarkers;
  const initOut = absT.isOut;
  const origRandom = Math.random;
  if (opts.rng) Math.random = opts.rng;
  try {
    resolveMelee_lab(absA, absT, weapon, !!opts.charged);
  } catch (e) {
    Math.random = origRandom;
    return { hit: false, ko: false, error: e.message };
  }
  Math.random = origRandom;

  const hit = (absT.isOut !== initOut) || (absT.bloodMarkers !== initBlood);
  const ko = absT.isOut && !initOut;
  if (ko) markModelOut(state, targetUid);
  return { hit, ko };
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 9 — Selector banda rival (arquetipos canon).
   ----------------------------------------------------------------------
 * Reemplaza el mirror match del Sprint 8 con un selector de banda rival.
 * V1: mirror + 6 arquetipos canon (FILL_MODEL_PROFILES adaptados a
 * companion-shape). Sprint 10+ podría añadir paste JSON Companion.
 */

/** Convierte una unit abstracta (FILL_MODEL_PROFILES) a companion-shape
 * compatible con sim espacial. Stats en string canon "+N", keywords y
 * equipment en arrays de objetos. */
function _lab2AbstractToCompanion(absUnit, uidPrefix, idx) {
  const sign = (n) => (n >= 0 ? '+' : '') + n;
  const weapons = (absUnit.weapons || []).map(w => ({
    name: w.name,
    type: w.isRanged ? 'ranged weapon' : 'melee weapon',
  }));
  const kws = [];
  if (absUnit.keywords && typeof absUnit.keywords.forEach === 'function') {
    absUnit.keywords.forEach(k => kws.push({ name: k }));
  }
  return {
    uid: uidPrefix + '_' + idx,
    name: absUnit.name || ('Trooper ' + idx),
    companionCost: absUnit.cost || 30,
    companionStats: {
      move: '6"/Infantry',
      ranged: sign(absUnit.rangedDice || 0),
      melee:  sign(absUnit.meleeDice || 0),
      armour: sign(absUnit.armour || 0),
    },
    companionKeywords: kws,
    companionAbilities: [],
    companionEquipment: weapons,
    tier: 'troops',
    isOut: false,
  };
}

/** Parsea un JSON Companion-format y devuelve sus models en companion-shape
 * listos para sim espacial. Companion JSON ya trae model-name + stat-* + cost
 * + equipment + abilities + keywords. Solo necesitamos remapearlos a
 * companionStats / companionEquipment / companionKeywords / companionAbilities.
 *
 * Returns: { ok: true, models } | { ok: false, error }. */
function _lab2ParseRivalJson(text) {
  if (!text || typeof text !== 'string') return { ok: false, error: 'Texto vacío.' };
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { return { ok: false, error: 'JSON inválido: ' + e.message }; }
  if (!parsed || !Array.isArray(parsed.models)) {
    return { ok: false, error: 'Falta array "models" en el JSON.' };
  }
  const out = [];
  for (let i = 0; i < parsed.models.length; i++) {
    const m = parsed.models[i];
    if (!m) continue;
    const name = m['model-name'] || m.name || ('Rival ' + i);
    const stats = {
      move:   m['stat-move']   || '6"/Infantry',
      ranged: m['stat-ranged'] || '+0',
      melee:  m['stat-melee']  || '+0',
      armour: m['stat-armour'] || '0',
    };
    // Companion JSON usa shapes con kebab-case keys. Normaliza para Lab2.
    const equipment = (m.equipment || []).map(e => ({
      name: e['equipment-name'] || e.name || '',
      type: e['equipment-type'] || e.type || 'equipment',
    }));
    const abilities = (m.abilities || []).map(a => ({
      name: a['ability-name'] || a.name || '',
    }));
    const keywords = (m.keywords || []).map(k => ({
      name: k['keyword-name'] || k.name || '',
    }));
    const cost = (m.cost && m.cost.ducats) || m.cost || 0;
    out.push({
      uid: 'rival_json_' + i + '_' + Date.now().toString(36),
      name,
      companionStats: stats,
      companionCost: cost,
      companionKeywords: keywords,
      companionAbilities: abilities,
      companionEquipment: equipment,
      tier: 'troops',
      isOut: false,
    });
  }
  if (out.length === 0) return { ok: false, error: 'No hay modelos válidos.' };
  return { ok: true, models: out };
}

/** Devuelve una banda sintética enemiga del arquetipo dado, con N modelos.
 * Mirror el formato de FILL_MODEL_PROFILES adaptado a companion-shape para
 * que el sim espacial pueda procesarla. */
function _lab2SyntheticEnemyBand(archetypeKey, count) {
  count = Math.max(1, count | 0);
  const profile = (typeof FILL_MODEL_PROFILES !== 'undefined' && FILL_MODEL_PROFILES[archetypeKey])
    || { name: 'Generic Trooper', cost: 30, meleeDice: 0, rangedDice: 0, armour: 0,
         weapons: [{ name: 'Rifle', isRanged: true }], keywords: new Set() };
  const band = [];
  for (let i = 0; i < count; i++) {
    band.push(_lab2AbstractToCompanion(profile, 'enemy_' + archetypeKey, i));
  }
  return band;
}

/* ----------------------------------------------------------------------
   Lab 2.0 — Sprint 6 — Replay 2D Canvas (post-mortem visualization).
   ----------------------------------------------------------------------
 * Sobre Sprint 4+5: añade un recorder de eventos por turno + 2 renderers
 * canvas 2D para visualizar batallas tipo XCOM-ASCII.
 *
 * Filosofía (roadmap sección 6): NO Tabletop Simulator. NO wargame digital.
 * Solo replay visual de una batalla concreta para análisis táctico, con
 * indicadores de movimiento + disparo + KO.
 *
 * Sin animación nativa — el caller decide tempo (setInterval o
 * requestAnimationFrame con un frameIdx incrementado). Esto mantiene el
 * código testeable y deja el control de tempo al consumidor.
 */

/** Corre una batalla con recorder activo y devuelve la transcripción
 * completa para replay posterior.
 *
 * Returns: {
 *   initial: { positions: { uid:{x,y} }, alive: { friendly:[uid], enemy:[uid] } },
 *   frames: [{ turn, events:[...], positions:{...}, alive:{friendly,enemy} }],
 *   result: { winner, turns, friendlyKO, enemyKO },
 * }
 *
 * Cada frame captura el ESTADO DESPUÉS DEL TURNO (no antes), incluyendo
 * los eventos generados durante esa activación. */
function buildBattleReplay(state, opts) {
  opts = opts || {};
  // Snapshot inicial (pre-batalla) antes de cualquier movimiento.
  const initialPositions = {};
  for (const side of ['friendly', 'enemy']) {
    for (const uid of Object.keys(state[side].positions)) {
      initialPositions[uid] = Object.assign({}, state[side].positions[uid]);
    }
  }
  const initialAlive = {
    friendly: state.friendly.models.filter(m => !m.isOut).map(m => m.uid),
    enemy:    state.enemy.models.filter(m => !m.isOut).map(m => m.uid),
  };

  const frames = [];
  let currentEvents = [];

  const recorder = {
    onEvent(ev) { currentEvents.push(ev); },
    onTurnEnd(turn, st) {
      // Snapshot tras el turno completo.
      const positions = {};
      for (const side of ['friendly', 'enemy']) {
        for (const uid of Object.keys(st[side].positions)) {
          positions[uid] = Object.assign({}, st[side].positions[uid]);
        }
      }
      const alive = {
        friendly: st.friendly.models.filter(m => !m.isOut).map(m => m.uid),
        enemy:    st.enemy.models.filter(m => !m.isOut).map(m => m.uid),
      };
      frames.push({ turn, events: currentEvents, positions, alive });
      currentEvents = [];
    },
  };

  const result = simulateBattleSpatial(state, Object.assign({}, opts, { recorder }));

  return {
    initial: { positions: initialPositions, alive: initialAlive },
    frames,
    result,
    map: state.map,  // referencia para que renderReplayFrame no tenga que pasarlo por opts.
    mapId: state.mapId,
  };
}

/** Colores canon-aligned para los 2 sides + terreno. Se exportan para que
 * el wire UI pueda reusarlos en otros widgets (tooltips, legends, etc.). */
const LAB2_REPLAY_COLORS = {
  friendlyFill:   '#c9a961',  // dorado (canon faithful)
  friendlyStroke: '#7f6b43',
  enemyFill:      '#9b1e1e',  // rojo sangre (canon fallen)
  enemyStroke:    '#5c1212',
  cellOpen:       '#d4c8a8',  // pergamino claro
  cellLight:      '#a89668',  // pergamino-light cover medio
  cellHeavy:      '#665540',  // marrón oscuro heavy cover
  cellBlocked:    '#2a1f15',  // casi-negro escombros
  gridLine:       '#7f6b43',
  text:           '#1a1410',
  textMuted:      '#5c4c3a',
  hitLine:        '#c9a961',
  koMark:         '#9b1e1e',
  activationHalo: '#e8c87a',  // amarillo claro: modelo activó este turno
};

/** Pinta el mapa de fondo (sin modelos) en (ctx, opts.x0, opts.y0). Usado
 * por renderReplayFrame y también como preview standalone.
 * opts: { x0=0, y0=0, cellPx=16 }. */
function renderBattleMap(ctx, map, opts) {
  opts = opts || {};
  const x0 = opts.x0 || 0;
  const y0 = opts.y0 || 0;
  const cellPx = opts.cellPx || 16;
  const C = LAB2_REPLAY_COLORS;
  // Cada celda: fillRect + strokeRect (border).
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.cells[y][x];
      let fill = C.cellOpen;
      if (cell.terrain === 'blocked') fill = C.cellBlocked;
      else if (cell.cover === 'heavy') fill = C.cellHeavy;
      else if (cell.cover === 'light') fill = C.cellLight;
      ctx.fillStyle = fill;
      ctx.fillRect(x0 + x * cellPx, y0 + y * cellPx, cellPx, cellPx);
    }
  }
  // Líneas de cuadrícula (cada 4" para no saturar).
  ctx.strokeStyle = C.gridLine;
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= map.height; y += 4) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + y * cellPx);
    ctx.lineTo(x0 + map.width * cellPx, y0 + y * cellPx);
    ctx.stroke();
  }
  for (let x = 0; x <= map.width; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x0 + x * cellPx, y0);
    ctx.lineTo(x0 + x * cellPx, y0 + map.height * cellPx);
    ctx.stroke();
  }
  // Border del mapa completo.
  ctx.strokeStyle = C.text;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, map.width * cellPx, map.height * cellPx);
}

/** Pinta un círculo en el centro de la celda (x,y) del grid. */
function _lab2DrawModelCircle(ctx, gridX, gridY, x0, y0, cellPx, fill, stroke) {
  const cx = x0 + gridX * cellPx + cellPx / 2;
  const cy = y0 + gridY * cellPx + cellPx / 2;
  const r = cellPx * 0.4;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, cellPx * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Pinta un frame del replay en el canvas dado.
 *
 *   - Dibuja mapa de fondo (renderBattleMap).
 *   - Pinta cada modelo vivo del frame como círculo de su side.
 *   - Pinta líneas de disparo del frame (events tipo 'shoot') del attacker
 *     al target con color hitLine + dashed si miss.
 *   - Marca KOs con una × roja sobre la última posición conocida del target.
 *
 * Clampea frameIdx a bounds; valores fuera renderean el frame inicial
 * (índice 0 conceptual) o el último, lo más cercano. */
function renderReplayFrame(ctx, replay, frameIdx, opts) {
  if (!ctx || !replay || !replay.frames) return;
  opts = opts || {};
  const x0 = opts.x0 || 0;
  const y0 = opts.y0 || 0;
  const cellPx = opts.cellPx || 16;
  const C = LAB2_REPLAY_COLORS;

  // Clamp frameIdx.
  let idx = frameIdx | 0;
  if (idx < 0) idx = 0;
  if (idx >= replay.frames.length) idx = replay.frames.length - 1;

  // Map de fondo: re-extrae del primer frame si conservamos referencia, o
  // del estado embebido en replay. Para V1 asumimos que renderReplayFrame
  // recibe el map en opts. Si no, intentamos buscarlo en replay.map.
  const map = opts.map || replay.map || null;
  if (map) renderBattleMap(ctx, map, { x0, y0, cellPx });

  // Pinta modelos en posiciones de este frame.
  const frame = replay.frames[idx];
  if (!frame) return;
  const aliveSet = {
    friendly: new Set(frame.alive.friendly),
    enemy:    new Set(frame.alive.enemy),
  };
  // Sprint 15: Set de uids que activaron en este turno (events 'activation-start').
  const activatedUids = new Set();
  for (const ev of frame.events) {
    if (ev.type === 'activation-start' && ev.uid) activatedUids.add(ev.uid);
  }
  for (const uid of Object.keys(frame.positions)) {
    const pos = frame.positions[uid];
    const isFriendly = aliveSet.friendly.has(uid);
    const isEnemy    = aliveSet.enemy.has(uid);
    if (!isFriendly && !isEnemy) continue;  // dead skip.
    // Halo de activación: anillo extra dorado alrededor del modelo si
    // activó este turno. Se pinta DEBAJO del círculo principal.
    if (activatedUids.has(uid)) {
      const cx = x0 + pos.x * cellPx + cellPx / 2;
      const cy = y0 + pos.y * cellPx + cellPx / 2;
      ctx.strokeStyle = C.activationHalo;
      ctx.lineWidth = Math.max(1, cellPx * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cellPx * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    const fill   = isFriendly ? C.friendlyFill   : C.enemyFill;
    const stroke = isFriendly ? C.friendlyStroke : C.enemyStroke;
    _lab2DrawModelCircle(ctx, pos.x, pos.y, x0, y0, cellPx, fill, stroke);
  }

  // Líneas de disparo + KO marks de este turno.
  for (const ev of frame.events) {
    if (ev.type === 'shoot') {
      const aPos = frame.positions[ev.attackerUid];
      const tPos = frame.positions[ev.targetUid];
      if (!aPos || !tPos) continue;
      ctx.strokeStyle = C.hitLine;
      ctx.lineWidth = Math.max(1, cellPx * 0.1);
      ctx.setLineDash(ev.hit ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(x0 + aPos.x * cellPx + cellPx / 2, y0 + aPos.y * cellPx + cellPx / 2);
      ctx.lineTo(x0 + tPos.x * cellPx + cellPx / 2, y0 + tPos.y * cellPx + cellPx / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (ev.type === 'ko') {
      // KO mark: ya no está en positions del frame. Intenta encontrarlo
      // en el frame anterior; fallback al initial.
      const prevFrame = idx > 0 ? replay.frames[idx - 1] : replay.initial;
      const lastPos = prevFrame.positions[ev.uid];
      if (!lastPos) continue;
      ctx.strokeStyle = C.koMark;
      ctx.lineWidth = Math.max(2, cellPx * 0.15);
      const cx = x0 + lastPos.x * cellPx + cellPx / 2;
      const cy = y0 + lastPos.y * cellPx + cellPx / 2;
      const r = cellPx * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    }
  }
}


