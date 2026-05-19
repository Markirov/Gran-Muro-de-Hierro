/* Lab 2.0 — Sprint 5 — Estadísticas agregadas sobre N batallas espaciales.
 *
 * Sobre Sprint 4 (sim loop), añade el harness estadístico:
 *
 *  - runBattleSeriesSpatial(opts): corre N batallas con bandas y mapa
 *    dados; agrega winRate, avgTurns, avgKO por side. Cada batalla
 *    arranca con un estado fresco (createLab2Battle + deployBandHeuristic
 *    para ambos sides) — los modelos de input no se mutan entre batallas.
 *
 * opts: {
 *   friendlyModels: [...], enemyModels: [...], mapId, nBattles=100,
 *   maxTurns=20, rangeInches=24, rng? (default Math.random)
 * }
 *
 * Returns: {
 *   nBattles, winRateFriendly, winRateEnemy, drawRate,
 *   avgTurns, avgFriendlyKO, avgEnemyKO,
 *   mapId, friendlyCount, enemyCount
 * }
 *
 * El sim loop ya es determinístico dado un rng, así que el harness lo es
 * también si pasas un PRNG seedeado.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_agg.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  runBattleSeriesSpatial: typeof runBattleSeriesSpatial === 'function' ? runBattleSeriesSpatial : null,
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
if (!lib.runBattleSeriesSpatial) { console.error('✗ runBattleSeriesSpatial missing'); process.exit(1); }
const { runBattleSeriesSpatial } = lib;

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

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ------------------------------------------------------------------ */
group('Group 1: runBattleSeriesSpatial estructura del resultado', () => {
  const r = runBattleSeriesSpatial({
    friendlyModels: [mkModel('f1','A'), mkModel('f2','B')],
    enemyModels:    [mkModel('e1','C'), mkModel('e2','D')],
    mapId: 'open-ground',
    nBattles: 10,
    maxTurns: 15,
    rangeInches: 24,
    rng: seededRng(42),
  });
  ok(r.nBattles === 10, 'nBattles preservado');
  ok(typeof r.winRateFriendly === 'number', 'winRateFriendly numérico');
  ok(typeof r.winRateEnemy === 'number', 'winRateEnemy numérico');
  ok(typeof r.drawRate === 'number', 'drawRate numérico');
  const sum = r.winRateFriendly + r.winRateEnemy + r.drawRate;
  ok(Math.abs(sum - 1) < 0.001, 'winRates suman 1 (got ' + sum.toFixed(3) + ')');
  ok(typeof r.avgTurns === 'number' && r.avgTurns >= 1, 'avgTurns ≥ 1');
  ok(typeof r.avgFriendlyKO === 'number', 'avgFriendlyKO numérico');
  ok(typeof r.avgEnemyKO === 'number', 'avgEnemyKO numérico');
  ok(r.mapId === 'open-ground', 'mapId preservado');
  ok(r.friendlyCount === 2 && r.enemyCount === 2,
     'counts preservados (2v2)');
});

group('Group 2: bandas simétricas → tasa de victoria balanceada', () => {
  const r = runBattleSeriesSpatial({
    friendlyModels: [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C')],
    enemyModels:    [mkModel('e1','D'), mkModel('e2','E'), mkModel('e3','F')],
    mapId: 'open-ground',
    nBattles: 50,
    maxTurns: 25,
    rangeInches: 24,
    rng: seededRng(12345),
  });
  // Bandas iguales: tasa friendly esperada en [0.30, 0.70].
  ok(r.winRateFriendly >= 0.30 && r.winRateFriendly <= 0.70,
     'winRateFriendly ∈ [0.30, 0.70] (got ' + r.winRateFriendly.toFixed(2) + ')');
});

group('Group 3: bandas asimétricas → ventaja al fuerte', () => {
  const strong = [
    mkModel('f1','Strong A', { stats:{ ranged:'+3' } }),
    mkModel('f2','Strong B', { stats:{ ranged:'+3' } }),
    mkModel('f3','Strong C', { stats:{ ranged:'+3' } }),
  ];
  const weak = [
    mkModel('e1','Weak A', { stats:{ ranged:'-1' } }),
    mkModel('e2','Weak B', { stats:{ ranged:'-1' } }),
    mkModel('e3','Weak C', { stats:{ ranged:'-1' } }),
  ];
  const r = runBattleSeriesSpatial({
    friendlyModels: strong,
    enemyModels: weak,
    mapId: 'open-ground',
    nBattles: 50,
    maxTurns: 25,
    rangeInches: 24,
    rng: seededRng(99),
  });
  ok(r.winRateFriendly > 0.65,
     'strong friendly winRate > 0.65 (got ' + r.winRateFriendly.toFixed(2) + ')');
});

group('Group 4: agregados sanos en mapas distintos', () => {
  // Nota: V1 deploy coloca en y=11/y=20 (centerline). ruined-village
  // tiene cover en y∈{5-8, 9-12, 17-19, etc.} — no necesariamente en
  // las filas de deployment. Por tanto NO podemos asumir que las ruinas
  // reduzcan KOs sin un sistema de cobertura activa durante advance.
  // Sprint 6 + canon engine refinará esto. Aquí solo validamos que los
  // agregados son finitos y razonables en ambos mapas.
  const f = () => [mkModel('f1','A'), mkModel('f2','B'), mkModel('f3','C')];
  const e = () => [mkModel('e1','D'), mkModel('e2','E'), mkModel('e3','F')];
  for (const mapId of ['open-ground', 'ruined-village']) {
    const r = runBattleSeriesSpatial({
      friendlyModels: f(), enemyModels: e(), mapId,
      nBattles: 20, maxTurns: 15, rangeInches: 24, rng: seededRng(7),
    });
    ok(r.avgFriendlyKO >= 0 && r.avgFriendlyKO <= 3,
       mapId + ' avgFriendlyKO ∈ [0,3] (got ' + r.avgFriendlyKO.toFixed(2) + ')');
    ok(r.avgEnemyKO >= 0 && r.avgEnemyKO <= 3,
       mapId + ' avgEnemyKO ∈ [0,3] (got ' + r.avgEnemyKO.toFixed(2) + ')');
    ok(r.avgTurns >= 1 && r.avgTurns <= 15,
       mapId + ' avgTurns ∈ [1,15]');
  }
});

group('Group 5: input models no se mutan entre batallas', () => {
  const f = [mkModel('f1','A')];
  const e = [mkModel('e1','B')];
  runBattleSeriesSpatial({
    friendlyModels: f, enemyModels: e, mapId: 'open-ground',
    nBattles: 5, maxTurns: 10, rangeInches: 24, rng: seededRng(1),
  });
  ok(f[0].isOut === false, 'friendly input model.isOut sigue false');
  ok(e[0].isOut === false, 'enemy input model.isOut sigue false');
});

group('Group 6: seedeado determinístico — misma seed mismos resultados', () => {
  const opts = {
    friendlyModels: [mkModel('f1','A'), mkModel('f2','B')],
    enemyModels:    [mkModel('e1','C'), mkModel('e2','D')],
    mapId: 'open-ground',
    nBattles: 20,
    maxTurns: 15,
    rangeInches: 24,
  };
  const r1 = runBattleSeriesSpatial(Object.assign({}, opts, { rng: seededRng(777) }));
  const r2 = runBattleSeriesSpatial(Object.assign({}, opts, { rng: seededRng(777) }));
  ok(r1.winRateFriendly === r2.winRateFriendly, 'winRateFriendly idéntico');
  ok(r1.avgTurns === r2.avgTurns, 'avgTurns idéntico');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
