/* Lab 2.0 — Sprint 19 — Scenario objectives (hold / breakthrough / capture).
 *
 * Canon TC tiene escenarios con condiciones de victoria distintas a
 * "elimina al rival". V1 spatial añade 3 además del default:
 *
 *  - 'pitched-battle' (default): wipeout. Comportamiento Sprints 1-18.
 *  - 'breakthrough': si CUALQUIER friendly alive llega a y ≥ height-4
 *    (zona profunda enemy), friendly gana. Mirror: enemy a y ≤ 3.
 *  - 'hold-the-line': si tras maxTurns ambos sides tienen survivors,
 *    gana el side con MÁS modelos en su mitad defensiva (canon hold).
 *    Friendly mitad inf, enemy mitad sup.
 *  - 'capture-point': punto objetivo central (24, 16). Si UN side tiene
 *    ≥1 modelo a 3" del objetivo y el otro 0, gana ese side al fin del turno.
 *
 * opts.scenarioId pasado a simulateBattleSpatial y runBattleSeriesSpatial.
 * Default 'pitched-battle' = back-compat completo.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_scenarios.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:      typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:            typeof placeModel === 'function' ? placeModel : null,
  simulateBattleSpatial: typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
  LAB2_SCENARIOS:        typeof LAB2_SCENARIOS !== 'undefined' ? LAB2_SCENARIOS : null,
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
for (const h of ['createLab2Battle','placeModel','simulateBattleSpatial','LAB2_SCENARIOS']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, simulateBattleSpatial, LAB2_SCENARIOS } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+0', melee: '+0', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    companionEquipment: opts.equipment || [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: LAB2_SCENARIOS define al menos 4 escenarios', () => {
  ok(typeof LAB2_SCENARIOS === 'object', 'LAB2_SCENARIOS es objeto');
  const ids = Object.keys(LAB2_SCENARIOS || {});
  ok(ids.length >= 4, '≥4 escenarios (got ' + ids.length + ')');
  for (const id of ['pitched-battle','breakthrough','hold-the-line','capture-point']) {
    ok(!!(LAB2_SCENARIOS && LAB2_SCENARIOS[id]), 'escenario ' + id + ' definido');
  }
});

group('Group 2: pitched-battle (default) comportamiento original', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+3' } })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 8, y: 5 });
  const r = simulateBattleSpatial(state, {
    rng: () => 0.01, maxTurns: 10, rangeInches: 24,
  });
  ok(['friendly','enemy','draw'].includes(r.winner), 'winner válido sin scenarioId');
  ok(r.winner === 'friendly', 'friendly gana con rng=0.01 (back-compat)');
});

group('Group 3: breakthrough — friendly gana si llega a zona profunda', () => {
  // Coloca friendly justo en la fila de victoria (y = height-4 = 28).
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ move:'12"/Flying' } })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 24, y: 28 });
  placeModel(state, 'enemy',    'e1', { x: 0,  y: 0 });
  const r = simulateBattleSpatial(state, {
    rng: () => 0.99, maxTurns: 2, rangeInches: 1,
    scenarioId: 'breakthrough',
  });
  // Friendly arrancó en zona victoria → gana inmediato o turno 1.
  ok(r.winner === 'friendly',
     'breakthrough friendly gana al estar en zona victoria (got ' + r.winner + ')');
});

group('Group 4: hold-the-line — survivors en zona propia decide tras maxTurns', () => {
  // Coloca ambos sides con survivors en sus mitades.
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C')],
    [mkModel('e1','D')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'friendly', 'f2', { x: 10, y: 5 });
  placeModel(state, 'friendly', 'f3', { x: 15, y: 5 });
  placeModel(state, 'enemy',    'e1', { x: 24, y: 25 });
  const r = simulateBattleSpatial(state, {
    rng: () => 0.99, maxTurns: 2, rangeInches: 1,
    scenarioId: 'hold-the-line',
  });
  // Friendly tiene 3 en su zona, enemy 1. Friendly gana por hold.
  ok(r.winner === 'friendly',
     'hold-the-line friendly gana con más holders (got ' + r.winner + ')');
});

group('Group 5: capture-point — control objetivo central determina win', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  // Friendly a 1" del objetivo (24,16); enemy lejos.
  placeModel(state, 'friendly', 'f1', { x: 24, y: 17 });
  placeModel(state, 'enemy',    'e1', { x: 0,  y: 0 });
  const r = simulateBattleSpatial(state, {
    rng: () => 0.99, maxTurns: 2, rangeInches: 1,
    scenarioId: 'capture-point',
  });
  ok(r.winner === 'friendly',
     'capture-point friendly cerca → gana (got ' + r.winner + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
