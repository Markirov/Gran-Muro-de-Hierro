/* Lab 2.0 — Sprint 4 — Sim loop espacial completo.
 *
 * Sobre Sprints 1-3 (mapas, estado, IA), añade el bucle de simulación:
 *
 *  - rollSpatialAttack(state, attackerUid, targetUid, opts): resuelve un
 *    ataque ranged abstracto. Aplica cover modifier según celda del target,
 *    devuelve {hit, ko, hitChance}. V1 modelo aproximado — el canon engine
 *    se integra en Sprint 5.
 *
 *  - simulateBattleSpatial(state, opts): bucle de turnos hasta que un side
 *    quede OoA o se llegue a maxTurns. Por turno: alternar activaciones
 *    side-A-model → side-B-model → side-A-model... Cada modelo decide su
 *    acción via chooseActionHeuristic y la ejecuta.
 *    Returns: { winner:'friendly'|'enemy'|'draw', turns, friendlyKO, enemyKO }.
 *
 *  - markModelOut(state, uid): marca el modelo como OoA y limpia su posición.
 *
 * V1 limitaciones documentadas en comentarios de implementación:
 *  - No melee. Solo ranged.
 *  - No charge. Advance se detiene cuando llega al rango.
 *  - Modelo de daño aproximado (no canon engine).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_sim.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:        typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:              typeof placeModel === 'function' ? placeModel : null,
  deployBandHeuristic:     typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  rollSpatialAttack:       typeof rollSpatialAttack === 'function' ? rollSpatialAttack : null,
  simulateBattleSpatial:   typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
  markModelOut:            typeof markModelOut === 'function' ? markModelOut : null,
  getModelPosition:        typeof getModelPosition === 'function' ? getModelPosition : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['createLab2Battle','placeModel','deployBandHeuristic','rollSpatialAttack','simulateBattleSpatial','markModelOut','getModelPosition']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, deployBandHeuristic, rollSpatialAttack, simulateBattleSpatial, markModelOut, getModelPosition } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+1', melee: '+1', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

function deterministicRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

/* ------------------------------------------------------------------ */
group('Group 1: rollSpatialAttack devuelve {hit, ko, hitChance}', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 8, y: 5 });
  const r = rollSpatialAttack(state, 'f1', 'e1', { rng: () => 0.01 });
  ok(typeof r === 'object', 'devuelve objeto');
  ok(typeof r.hit === 'boolean', 'r.hit boolean');
  ok(typeof r.ko === 'boolean', 'r.ko boolean');
  ok(typeof r.hitChance === 'number', 'r.hitChance numérico');
  ok(r.hitChance >= 0 && r.hitChance <= 1, 'hitChance en [0,1]');
});

group('Group 2: cover reduce hit chance', () => {
  const stateOpen = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(stateOpen, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(stateOpen, 'enemy', 'e1', { x: 8, y: 5 });
  const rOpen = rollSpatialAttack(stateOpen, 'f1', 'e1', { rng: () => 0.99 });

  // Mismo escenario en ruined-village colocando target en heavy cover.
  const stateCover = createLab2Battle('ruined-village',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  // (14,16) es heavy cover en ruined-village.
  placeModel(stateCover, 'friendly', 'f1', { x: 14, y: 12 });
  placeModel(stateCover, 'enemy', 'e1', { x: 14, y: 16 });
  const rCover = rollSpatialAttack(stateCover, 'f1', 'e1', { rng: () => 0.99 });

  ok(rCover.hitChance < rOpen.hitChance,
     'heavy cover reduce hit chance (open=' + rOpen.hitChance.toFixed(2) +
     ', cover=' + rCover.hitChance.toFixed(2) + ')');
});

group('Group 3: rollSpatialAttack rng determinista hit/miss', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+2' } })], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 8, y: 5 });
  const rHit = rollSpatialAttack(state, 'f1', 'e1', { rng: () => 0.01 });
  ok(rHit.hit === true, 'rng=0.01 (siempre bajo umbral) → hit');
  const rMiss = rollSpatialAttack(state, 'f1', 'e1', { rng: () => 0.99 });
  ok(rMiss.hit === false, 'rng=0.99 → miss');
});

group('Group 4: markModelOut limpia posición + flag isOut', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], []);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  markModelOut(state, 'f1');
  ok(getModelPosition(state, 'f1') === null, 'posición limpiada');
  ok(state.friendly.models.find(m => m.uid === 'f1').isOut === true,
     'flag isOut=true');
});

group('Group 5: simulateBattleSpatial termina cuando un side OoA', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+3' } })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 8, y: 5 });
  // RNG sesgado a hits + KOs.
  const result = simulateBattleSpatial(state, {
    rng: () => 0.01,
    maxTurns: 20,
    rangeInches: 24,
  });
  ok(typeof result === 'object', 'devuelve objeto resultado');
  ok(['friendly','enemy','draw'].includes(result.winner),
     'winner en {friendly,enemy,draw}');
  ok(result.winner === 'friendly', 'friendly gana (ranged sesgado)');
  ok(result.turns >= 1, 'turns ≥ 1');
});

group('Group 6: simulateBattleSpatial respeta maxTurns', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C'), mkModel('e2','D')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  // RNG sesgado a miss + no KO → batalla infinita salvo por maxTurns.
  const result = simulateBattleSpatial(state, {
    rng: () => 0.99,
    maxTurns: 3,
    rangeInches: 24,
  });
  ok(result.turns <= 3, 'no excede maxTurns (got ' + result.turns + ')');
  // En maxTurns reach, winner debería ser 'draw' o quien tenga más vivos.
  ok(['friendly','enemy','draw'].includes(result.winner),
     'winner válido tras maxTurns');
});

group('Group 7: simulateBattleSpatial trackea KOs por side', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B')],
    [mkModel('e1','C'), mkModel('e2','D')]);
  deployBandHeuristic(state, 'friendly');
  deployBandHeuristic(state, 'enemy');
  const result = simulateBattleSpatial(state, {
    rng: () => 0.01,
    maxTurns: 30,
    rangeInches: 24,
  });
  ok(typeof result.friendlyKO === 'number', 'friendlyKO numérico');
  ok(typeof result.enemyKO === 'number', 'enemyKO numérico');
  ok(result.friendlyKO + result.enemyKO >= 1,
     '≥1 KO total (rng sesgado a hits)');
});

group('Group 8: friendly y enemy iguales y rng neutro → tasa de victoria ~50%', () => {
  // Sim de 30 batallas con rng "neutro" (pseudo-random) — verifica que
  // no hay sesgo sistemático hacia un side.
  let friendlyWins = 0;
  for (let i = 0; i < 30; i++) {
    const state = createLab2Battle('open-ground',
      [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C')],
      [mkModel('e1','D'), mkModel('e2','E'), mkModel('e3','F')]);
    deployBandHeuristic(state, 'friendly');
    deployBandHeuristic(state, 'enemy');
    let seed = i * 7919 + 13;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const r = simulateBattleSpatial(state, { rng, maxTurns: 25, rangeInches: 24 });
    if (r.winner === 'friendly') friendlyWins++;
  }
  // Tolerancia amplia: 8 ≤ wins ≤ 22 (es 30 batallas, balance esperado ~15).
  ok(friendlyWins >= 8 && friendlyWins <= 22,
     'friendly wins ∈ [8,22] de 30 (got ' + friendlyWins + ') — sin sesgo sistemático');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
