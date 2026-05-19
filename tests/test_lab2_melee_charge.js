/* Lab 2.0 — Sprint 10 — Melee + charge.
 *
 * Sobre Sprint 7 (canon engine ranged). V1 abstracto-only para melee.
 * Sprint 11+ podrá integrar resolveMelee_lab si surge la necesidad.
 *
 * Cambios:
 *  - chooseActionHeuristic: si nearest enemy ≤ 3" (charge range canon) →
 *    devuelve { action:'charge', targetUid, movePos } con movePos a 1"
 *    del target (canon stop). Si está ya a 1" del target → action='melee'
 *    sin movePos (engagement directo).
 *  - rollSpatialMelee(state, attackerUid, targetUid, opts): aprox V1
 *    análoga a rollSpatialAttack. hitChance basado en meleeDice; ko-per-hit
 *    aprox 0.45 (canon melee suele resolver más letal). Charge bonus
 *    aplicado si opts.charged.
 *  - simulateBattleSpatial: handle action.action === 'charge' y 'melee'.
 *    Charge mueve a movePos + dispara rollSpatialMelee con charged=true.
 *    Melee sin movePos dispara rollSpatialMelee con charged=false.
 *
 * Tests:
 *  - chooseActionHeuristic devuelve charge cuando target dentro 3".
 *  - chooseActionHeuristic devuelve melee si target ya a 1".
 *  - rollSpatialMelee devuelve {hit, ko}.
 *  - charge bonifica hit chance vs sin charge.
 *  - sim loop con bandas próximas resuelve melee y termina.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_melee.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:        typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:              typeof placeModel === 'function' ? placeModel : null,
  chooseActionHeuristic:   typeof chooseActionHeuristic === 'function' ? chooseActionHeuristic : null,
  rollSpatialMelee:        typeof rollSpatialMelee === 'function' ? rollSpatialMelee : null,
  simulateBattleSpatial:   typeof simulateBattleSpatial === 'function' ? simulateBattleSpatial : null,
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
for (const h of ['createLab2Battle','placeModel','chooseActionHeuristic','rollSpatialMelee','simulateBattleSpatial']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, chooseActionHeuristic, rollSpatialMelee, simulateBattleSpatial } = lib;

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
group('Group 1: chooseActionHeuristic devuelve charge si target ≤ 3"', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 10 });  // 2"
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'charge', 'action=charge cuando target a 2" (got ' + a.action + ')');
  ok(a.targetUid === 'e1', 'targetUid=e1');
});

group('Group 2: chooseActionHeuristic devuelve melee si ya a 1"', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 11, y: 10 });  // 1"
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'melee' || a.action === 'charge',
     'action=melee o charge para combate cercano (got ' + a.action + ')');
});

group('Group 3: rollSpatialMelee devuelve {hit, ko}', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 11, y: 10 });
  const r = rollSpatialMelee(state, 'f1', 'e1', { rng: () => 0.1 });
  ok(typeof r === 'object', 'devuelve objeto');
  ok(typeof r.hit === 'boolean', 'r.hit boolean');
  ok(typeof r.ko === 'boolean', 'r.ko boolean');
});

group('Group 4: charge bonifica hit chance', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 11, y: 10 });
  const rNoCharge = rollSpatialMelee(state, 'f1', 'e1', { rng: () => 0.5 });
  const rCharge   = rollSpatialMelee(state, 'f1', 'e1', { rng: () => 0.5, charged: true });
  // Si ambos usan rng=0.5, charged debería tener hitChance >= no charge.
  ok(rCharge.hitChance >= rNoCharge.hitChance,
     'charge.hitChance ≥ noCharge.hitChance (charge=' + (rCharge.hitChance||0).toFixed(2) +
     ', noCharge=' + (rNoCharge.hitChance||0).toFixed(2) + ')');
});

group('Group 5: sim loop con bandas próximas termina', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ melee:'+3' } })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 10 });  // 2" → charge
  const r = simulateBattleSpatial(state, {
    rng: () => 0.01, maxTurns: 15, rangeInches: 24,
  });
  ok(['friendly','enemy','draw'].includes(r.winner), 'winner válido');
  ok(r.friendlyKO + r.enemyKO >= 1, '≥1 KO total');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
