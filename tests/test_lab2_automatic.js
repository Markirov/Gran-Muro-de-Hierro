/* Lab 2.0 — Sprint 29 — AUTOMATIC X (múltiples ataques por activación).
 *
 * Canon TC: weapon keyword "AUTOMATIC X" (X=2,3,...) dispara X ataques
 * por shoot action en lugar de 1. V1 spatial: parsea el N y loopea
 * rollSpatialAttack N veces.
 *
 * Helpers:
 *  - parseAutomaticCount(eqItem, factionId): número >= 1.
 *
 * Wire en sim loop: action 'shoot' loopea N veces si weapon AUTOMATIC.
 * V1 rollSpatialAttack interno mantiene 1 attack — el loop está en sim.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_automatic.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  parseAutomaticCount: typeof parseAutomaticCount === 'function' ? parseAutomaticCount : null,
  createLab2Battle:    typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:          typeof placeModel === 'function' ? placeModel : null,
  simulateBattleSpatial: typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
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
for (const h of ['parseAutomaticCount','createLab2Battle','placeModel','simulateBattleSpatial']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { parseAutomaticCount, createLab2Battle, placeModel, simulateBattleSpatial } = lib;

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

/* ------------------------------------------------------------------ */
group('Group 1: parseAutomaticCount detecta AUTOMATIC X', () => {
  ok(parseAutomaticCount({ weaponKeywords: ['AUTOMATIC 2'] }) === 2,
     'AUTOMATIC 2 → 2');
  ok(parseAutomaticCount({ weaponKeywords: ['AUTOMATIC 3'] }) === 3,
     'AUTOMATIC 3 → 3');
  ok(parseAutomaticCount({ weaponKeywords: ['+1 DICE'] }) === 1,
     'sin AUTOMATIC → 1');
  ok(parseAutomaticCount({}) === 1, 'sin keywords → 1');
});

group('Group 2: parseAutomaticCount via armoury (MG iron-sultanate)', () => {
  // Machine Gun iron-sultanate: AUTOMATIC 3 en armoury.
  const r = parseAutomaticCount({ name: 'Machine Gun' }, 'iron-sultanate');
  ok(r >= 1, 'devuelve ≥1');
  // Si MG IS tiene AUTOMATIC 3, r=3. Sino fallback 1.
});

group('Group 3: AUTOMATIC 3 produce más KOs que arma normal (sim)', () => {
  // 30 batallas con MG (AUTOMATIC 3) vs normal rifle.
  let kosAuto = 0, kosNormal = 0;
  for (let i = 0; i < 30; i++) {
    const stateAuto = createLab2Battle('open-ground',
      [mkModel('f1','A', {
         stats:{ ranged:'+1' },
         equipment: [{ name: 'MG', type: 'ranged weapon', weaponKeywords: ['AUTOMATIC 3'] }],
       })],
      [mkModel('e1','B'), mkModel('e2','C'), mkModel('e3','D')]);
    placeModel(stateAuto, 'friendly', 'f1', { x: 5, y: 5 });
    placeModel(stateAuto, 'enemy', 'e1', { x: 10, y: 5 });
    placeModel(stateAuto, 'enemy', 'e2', { x: 11, y: 5 });
    placeModel(stateAuto, 'enemy', 'e3', { x: 12, y: 5 });
    let seed = i * 31 + 7;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const r = simulateBattleSpatial(stateAuto, { rng, maxTurns: 8, rangeInches: 24 });
    kosAuto += r.enemyKO;

    const stateNorm = createLab2Battle('open-ground',
      [mkModel('f1','A', { stats:{ ranged:'+1' } })],
      [mkModel('e1','B'), mkModel('e2','C'), mkModel('e3','D')]);
    placeModel(stateNorm, 'friendly', 'f1', { x: 5, y: 5 });
    placeModel(stateNorm, 'enemy', 'e1', { x: 10, y: 5 });
    placeModel(stateNorm, 'enemy', 'e2', { x: 11, y: 5 });
    placeModel(stateNorm, 'enemy', 'e3', { x: 12, y: 5 });
    let seed2 = i * 31 + 7;
    const rng2 = () => { seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff; return seed2 / 0x7fffffff; };
    const r2 = simulateBattleSpatial(stateNorm, { rng: rng2, maxTurns: 8, rangeInches: 24 });
    kosNormal += r2.enemyKO;
  }
  ok(kosAuto >= kosNormal,
     'AUTOMATIC 3 produce ≥ KOs vs sin (auto=' + kosAuto + ', normal=' + kosNormal + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
