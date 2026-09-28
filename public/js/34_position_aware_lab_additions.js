/* ======================================================================
   Position-aware Lab additions.

   Tabletop canon TC ≈ 48"x32". Bandas A/B en extremos opuestos del
   eje X, spread Y aleatorio. Cada modelo recibe _pos:{x,y} al
   deployar. distance() euclidean. findCAClustersReal y
   applyConcentratedAttackReal usan proximidad real (canon 2" para
   Concentrated Attack).

   El motor existente NO consume _pos automáticamente — los helpers
   se exponen para opt mode='real' en simulateBattle_lab y para
   uso explícito desde la UI Lab cuando se quiera precisión.
   ====================================================================== */

const _TABLE_W = 48;
const _TABLE_H = 32;

function deployBands(bandA, bandB, opts) {
  if (!Array.isArray(bandA) || !Array.isArray(bandB)) return;
  const tableW = (opts && opts.tableW) || _TABLE_W;
  const tableH = (opts && opts.tableH) || _TABLE_H;
  // Deploy zones: 8" wide en cada extremo, spread Y completo.
  const zoneW = 8;
  for (const m of bandA) {
    if (!m) continue;
    m._pos = {
      x: Math.random() * zoneW,
      y: Math.random() * tableH,
    };
  }
  for (const m of bandB) {
    if (!m) continue;
    m._pos = {
      x: tableW - Math.random() * zoneW,
      y: Math.random() * tableH,
    };
  }
}

function distance(a, b) {
  if (!a || !b || !a._pos || !b._pos) return Infinity;
  const dx = a._pos.x - b._pos.x;
  const dy = a._pos.y - b._pos.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/* Sub-B — Movement entre fases.
 * Mueve model._pos hasta maxMove pulgadas hacia el enemy alive más
 * cercano. Para en 1" del target (canon stop, evita overlap melee).
 * Defensive: model sin _pos o sin enemies alive → no-op.
 */
function moveTowardClosest(model, enemies, maxMove) {
  if (!model || !model._pos || !Array.isArray(enemies)) return;
  let closest = null;
  let closestDist = Infinity;
  for (const e of enemies) {
    if (!e || e.isOut || !e._pos) continue;
    const d = distance(model, e);
    if (d < closestDist) { closest = e; closestDist = d; }
  }
  if (!closest) return;
  // Canon stop a 1" para evitar overlap (movement no carga).
  const stopBuffer = 1;
  const moveDist = Math.min(maxMove, Math.max(0, closestDist - stopBuffer));
  if (moveDist <= 0) return;
  const dx = closest._pos.x - model._pos.x;
  const dy = closest._pos.y - model._pos.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (norm === 0) return;
  model._pos.x += (dx / norm) * moveDist;
  model._pos.y += (dy / norm) * moveDist;
}

/* Sub-A — range check usando posiciones reales.
 * Si attacker O target no tienen _pos (modo no-real), permite por
 * back-compat. Si ambos tienen _pos y weapon tiene range numérico
 * o string (e.g. "24\""), compara distance contra el range parseado.
 */
function isWithinWeaponRange(attacker, target, weapon) {
  if (!attacker || !target || !attacker._pos || !target._pos) return true;
  if (!weapon || weapon.range == null) return true;
  // Parse range — puede ser número o string "24\"" o "Melee".
  let r = weapon.range;
  if (typeof r === 'string') {
    if (/melee/i.test(r)) return distance(attacker, target) <= 1;
    const m = r.match(/(\d+)/);
    if (!m) return true;  // unknown format → permite
    r = parseInt(m[1], 10);
  }
  if (typeof r !== 'number' || isNaN(r) || r <= 0) return true;
  return distance(attacker, target) <= r;
}

function findCAClustersReal(leadModel, allies, weaponName) {
  if (!leadModel || !Array.isArray(allies) || !weaponName) return [];
  const cluster = [leadModel];
  for (const m of allies) {
    if (!m || m === leadModel) continue;
    if (distance(leadModel, m) > 2) continue;
    if (!Array.isArray(m.weapons)) continue;
    if (!m.weapons.some(w => w && w.name === weaponName && w.isRanged)) continue;
    cluster.push(m);
  }
  return cluster;
}

function applyConcentratedAttackReal(band, opts) {
  if (!Array.isArray(band) || band.length === 0) return [];
  const max = (opts && typeof opts.max === 'number') ? opts.max : 4;
  // Para evitar doble-conteo: track modelos ya bonificados como parte
  // de un cluster. Iteramos buscando leads en orden, cada lead toma
  // su cluster real y bonifica los miembros aún no bonificados.
  const bonified = new Set();
  const report = [];
  for (const lead of band) {
    if (!lead || bonified.has(lead)) continue;
    if (!Array.isArray(lead.weapons)) continue;
    const rangedW = lead.weapons.find(w => w && w.isRanged);
    if (!rangedW) continue;
    const cluster = findCAClustersReal(lead, band, rangedW.name)
      .filter(m => !bonified.has(m));
    if (cluster.length < 2) continue;
    const bonus = Math.min(max, cluster.length - 1);
    for (const m of cluster) {
      if (typeof m.rangedDice === 'number') m.rangedDice += bonus;
      bonified.add(m);
    }
    report.push({ weaponName: rangedW.name, size: cluster.length, bonus });
  }
  return report;
}

/* Opt 2 — Concentrated Attack clustered (refinamiento sobre positional).
 *
 * positional asume que TODOS los modelos del mismo weapon name
 * coordinan. Clustered modela la realidad canon: dentro de un grupo
 * de N modelos, puede que sólo subsets coordinen (fireteam de 2-3
 * en lugar de los 5). Sortea fragmentación probabilística por grupo.
 *
 * Útil cuando se quiere variancia inter-battle más realista (cluster
 * bonus stochastic). Para análisis deterministas, usar positional.
 */
function applyConcentratedAttackClustered(band, opts) {
  if (!Array.isArray(band) || band.length === 0) return [];
  const max = (opts && typeof opts.max === 'number') ? opts.max : 4;
  // Agrupar por weapon name del primer arma ranged.
  const groups = new Map();
  for (const m of band) {
    if (!m || !Array.isArray(m.weapons)) continue;
    const rangedW = m.weapons.find(w => w && w.isRanged);
    if (!rangedW || !rangedW.name) continue;
    if (!groups.has(rangedW.name)) groups.set(rangedW.name, []);
    groups.get(rangedW.name).push(m);
  }
  const report = [];
  for (const [weaponName, members] of groups.entries()) {
    if (members.length < 2) continue;
    // Sortea fragmentación: cluster size ~ uniform 2..members.length.
    // Si cluster_size < members, los restantes quedan sin coordinar
    // (también pueden tener su propio sub-cluster en otra ronda;
    // como aproximación sólo uno por grupo en cada llamada).
    const clusterSize = 2 + Math.floor(Math.random() * (members.length - 1));
    const bonus = Math.min(max, clusterSize - 1);
    // Pick random clusterSize members del grupo para coordinar.
    const shuffled = members.slice().sort(() => Math.random() - 0.5);
    const coordinated = shuffled.slice(0, clusterSize);
    for (const m of coordinated) {
      if (typeof m.rangedDice === 'number') m.rangedDice += bonus;
    }
    report.push({ weaponName, totalInGroup: members.length, clusterSize, bonus });
  }
  return report;
}

function applyConcentratedAttackPositional(band, opts) {
  if (!Array.isArray(band) || band.length === 0) return [];
  const max = (opts && typeof opts.max === 'number') ? opts.max : 4;
  // Agrupar por primer arma ranged de cada modelo.
  const groups = new Map();
  for (const m of band) {
    if (!m || !Array.isArray(m.weapons)) continue;
    const rangedW = m.weapons.find(w => w && w.isRanged);
    if (!rangedW || !rangedW.name) continue;
    if (!groups.has(rangedW.name)) groups.set(rangedW.name, []);
    groups.get(rangedW.name).push(m);
  }
  const report = [];
  for (const [weaponName, members] of groups.entries()) {
    if (members.length < 2) continue;
    const bonus = Math.min(max, members.length - 1);
    for (const m of members) {
      if (typeof m.rangedDice === 'number') m.rangedDice += bonus;
    }
    report.push({ weaponName, count: members.length, bonus });
  }
  return report;
}

function applyConcentratedAttackToBand(band, opts) {
  if (!Array.isArray(band) || band.length === 0) return 0;
  const max = (opts && typeof opts.max === 'number') ? opts.max : 4;
  const bonus = Math.min(max, band.length - 1);
  if (bonus <= 0) return 0;
  for (const m of band) {
    if (!m) continue;
    if (typeof m.rangedDice === 'number') {
      m.rangedDice += bonus;
    }
  }
  return bonus;
}

function computeConcentratedAttackDice(leadDice, contributors, opts) {
  const base = (typeof leadDice === 'number' && leadDice > 0) ? leadDice : 0;
  if (base === 0) return 0;
  let n = typeof contributors === 'number' ? contributors : 0;
  if (n < 0) n = 0;
  const max = (opts && typeof opts.max === 'number') ? opts.max : 4;
  if (n > max) n = max;
  return base + n;
}


