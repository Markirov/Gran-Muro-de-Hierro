/* Lab 2.0 — Sprint 20 — Per-turn statistics graph.
 *
 * Sobre Sprint 5 (agregados N batallas). Añade tracking de "alive count"
 * por side por turno, agregado a través de las N batallas. Útil para
 * visualizar la "curva de attrition" — cómo cae cada banda turno a turno.
 *
 * Cambios:
 *  - simulateBattleSpatial cuando opts.trackPerTurn=true devuelve además
 *    perTurn: { friendly: [...], enemy: [...] } con counts post-turno.
 *  - runBattleSeriesSpatial siempre trackea internamente y devuelve
 *    avgAlivePerTurn: { friendly: [avg], enemy: [avg] }. Longitud = maxTurns + 1
 *    (índice 0 = pre-batalla, índice N = post-turn N).
 *  - renderStatsGraph(ctx, perTurnStats, opts): pinta line chart simple
 *    con eje X = turno, eje Y = alive count. 2 líneas (friendly + enemy).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_perturn.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:        typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:              typeof placeModel === 'function' ? placeModel : null,
  deployBandHeuristic:     typeof deployBandHeuristic === 'function' ? deployBandHeuristic : null,
  simulateBattleSpatial:   typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
  runBattleSeriesSpatial:  typeof runBattleSeriesSpatial === 'function' ? runBattleSeriesSpatial : null,
  renderStatsGraph:        typeof renderStatsGraph === 'function' ? renderStatsGraph : null,
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
for (const h of ['createLab2Battle','placeModel','deployBandHeuristic','simulateBattleSpatial','runBattleSeriesSpatial','renderStatsGraph']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, deployBandHeuristic, simulateBattleSpatial, runBattleSeriesSpatial, renderStatsGraph } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+1', melee: '+1', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    companionEquipment: opts.equipment || [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

function mkCtx() {
  const calls = [];
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    fillRect: () => calls.push({fn:'fillRect'}),
    strokeRect: () => calls.push({fn:'strokeRect'}),
    fillText: () => calls.push({fn:'fillText'}),
    beginPath: () => calls.push({fn:'beginPath'}),
    moveTo: () => calls.push({fn:'moveTo'}),
    lineTo: () => calls.push({fn:'lineTo'}),
    arc: () => calls.push({fn:'arc'}),
    fill: () => calls.push({fn:'fill'}),
    stroke: () => calls.push({fn:'stroke'}),
    closePath: () => calls.push({fn:'closePath'}),
    save: () => calls.push({fn:'save'}),
    restore: () => calls.push({fn:'restore'}),
    setLineDash: () => calls.push({fn:'setLineDash'}),
    measureText: () => ({width: 10}),
    canvas: { width: 400, height: 250 },
  };
  ctx._calls = calls;
  return ctx;
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ------------------------------------------------------------------ */
group('Group 1: simulateBattleSpatial con trackPerTurn devuelve perTurn', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A',{ stats:{ ranged:'+3' } })], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 10, y: 5 });
  const r = simulateBattleSpatial(state, {
    rng: () => 0.01, maxTurns: 10, rangeInches: 24,
    trackPerTurn: true,
  });
  ok(typeof r.perTurn === 'object', 'r.perTurn presente');
  ok(Array.isArray(r.perTurn.friendly), 'perTurn.friendly array');
  ok(Array.isArray(r.perTurn.enemy), 'perTurn.enemy array');
  // Longitud al menos turn 0 + turn 1.
  ok(r.perTurn.friendly.length >= 2, 'al menos 2 puntos (turn 0 + 1)');
});

group('Group 2: runBattleSeriesSpatial devuelve avgAlivePerTurn', () => {
  const r = runBattleSeriesSpatial({
    friendlyModels: [mkModel('f1','A'), mkModel('f2','B')],
    enemyModels:    [mkModel('e1','C'), mkModel('e2','D')],
    mapId: 'open-ground',
    nBattles: 20,
    maxTurns: 10,
    rangeInches: 24,
    rng: seededRng(42),
  });
  ok(r.avgAlivePerTurn && typeof r.avgAlivePerTurn === 'object',
     'avgAlivePerTurn objeto');
  ok(Array.isArray(r.avgAlivePerTurn.friendly),
     'avgAlivePerTurn.friendly array');
  ok(r.avgAlivePerTurn.friendly[0] === 2,
     'turn 0 friendly=2 (pre-batalla, todos vivos)');
  ok(r.avgAlivePerTurn.enemy[0] === 2,
     'turn 0 enemy=2');
  // Última fila debería ser ≤ inicial (atrition).
  const last = r.avgAlivePerTurn.friendly[r.avgAlivePerTurn.friendly.length - 1];
  ok(last >= 0 && last <= 2, 'last friendly entre 0 y 2');
});

group('Group 3: renderStatsGraph pinta líneas en canvas', () => {
  const ctx = mkCtx();
  const perTurnStats = {
    friendly: [3, 3, 2, 2, 1, 0],
    enemy:    [3, 2, 2, 1, 1, 1],
  };
  let threw = false;
  try { renderStatsGraph(ctx, perTurnStats, { width: 400, height: 250 }); }
  catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'renderStatsGraph no-throw');
  // Debería haber al menos 1 moveTo + N lineTo por línea (2 líneas).
  const moveTos = ctx._calls.filter(c => c.fn === 'moveTo').length;
  const lineTos = ctx._calls.filter(c => c.fn === 'lineTo').length;
  ok(moveTos >= 2, '≥2 moveTo (friendly + enemy lines)');
  ok(lineTos >= 5, '≥5 lineTo (puntos por línea)');
});

group('Group 4: renderStatsGraph datos vacíos no-throw', () => {
  const ctx = mkCtx();
  let threw = false;
  try { renderStatsGraph(ctx, { friendly: [], enemy: [] }, {}); }
  catch (e) { threw = true; }
  ok(!threw, 'datos vacíos no-throw');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
