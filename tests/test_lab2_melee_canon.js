/* Lab 2.0 — Sprint 14 — Canon engine para melee (resolveMelee_lab).
 *
 * Sobre Sprint 7 (ranged canon) + Sprint 10 (melee V1 abstracto). Añade
 * rollSpatialMeleeCanon que usa resolveMelee_lab del Lab abstracto en
 * vez del modelo aproximado.
 *
 *  - rollSpatialMeleeCanon(state, attackerUid, targetUid, opts):
 *    análogo a rollSpatialAttackCanon. Adapta ambos modelos +
 *    arma melee del attacker, llama resolveMelee_lab(absA, absT, w,
 *    opts.charged). Detecta hit/ko por delta isOut/bloodMarkers.
 *  - simulateBattleSpatial wire: cuando useCanonEngine, charge / melee
 *    usan canon en vez del rollSpatialMelee V1.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_meleecanon.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:        typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:              typeof placeModel === 'function' ? placeModel : null,
  rollSpatialMeleeCanon:   typeof rollSpatialMeleeCanon === 'function' ? rollSpatialMeleeCanon : null,
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
for (const h of ['createLab2Battle','placeModel','rollSpatialMeleeCanon','simulateBattleSpatial']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, rollSpatialMeleeCanon, simulateBattleSpatial } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, opts = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry', ranged: '+0', melee: '+1', armour: '0' }, opts.stats || {}),
    companionKeywords: opts.keywords || [],
    companionAbilities: [],
    companionEquipment: opts.equipment || [],
    tier: opts.tier || 'troops',
    isOut: false,
  };
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ------------------------------------------------------------------ */
group('Group 1: rollSpatialMeleeCanon devuelve {hit, ko}', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ melee:'+2' },
                          equipment:[{ name:'Sword/Axe', type:'melee weapon' }] })],
    [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 11, y: 10 });
  state.factionId = 'iron-sultanate';
  let r, threw = false;
  try { r = rollSpatialMeleeCanon(state, 'f1', 'e1', { rng: () => 0.5 }); }
  catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'no-throw');
  ok(typeof r === 'object', 'devuelve objeto');
  ok(typeof r.hit === 'boolean', 'r.hit boolean');
  ok(typeof r.ko === 'boolean', 'r.ko boolean');
});

group('Group 2: charge bonifica vs no-charge (statistical)', () => {
  const stateA = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ melee:'+1' }, equipment:[{name:'Trench Knife',type:'melee weapon'}] })],
    [mkModel('e1','B')]);
  const stateB = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ melee:'+1' }, equipment:[{name:'Trench Knife',type:'melee weapon'}] })],
    [mkModel('e1','B')]);
  placeModel(stateA, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(stateA, 'enemy', 'e1', { x: 11, y: 10 });
  placeModel(stateB, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(stateB, 'enemy', 'e1', { x: 11, y: 10 });
  stateA.factionId = 'iron-sultanate';
  stateB.factionId = 'iron-sultanate';
  let hitsNo = 0, hitsCharge = 0;
  const N = 300;
  for (let i = 0; i < N; i++) {
    stateA.enemy.models[0].isOut = false;
    stateB.enemy.models[0].isOut = false;
    placeModel(stateA, 'enemy', 'e1', { x: 11, y: 10 });
    placeModel(stateB, 'enemy', 'e1', { x: 11, y: 10 });
    const rNo = rollSpatialMeleeCanon(stateA, 'f1', 'e1', {});
    const rCh = rollSpatialMeleeCanon(stateB, 'f1', 'e1', { charged: true });
    if (rNo.hit) hitsNo++;
    if (rCh.hit) hitsCharge++;
  }
  // Charge canon usa el flag charged en resolveMelee_lab. Statistically
  // should be similar o ligeramente más, no menos. Tolerancia amplia.
  ok(hitsCharge >= hitsNo - 30,
     'charge no es peor que no-charge en gran muestra (charge=' + hitsCharge + ', no=' + hitsNo + ')');
});

group('Group 3: sim loop useCanonEngine + bandas próximas no-throw', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ melee:'+2' }, equipment:[{name:'Sword/Axe',type:'melee weapon'}] })],
    [mkModel('e1','B', { equipment:[{name:'Sword/Axe',type:'melee weapon'}] })]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 12, y: 10 });
  state.factionId = 'iron-sultanate';
  let r, threw = false;
  try {
    r = simulateBattleSpatial(state, {
      rng: seededRng(50), maxTurns: 20, rangeInches: 24,
      useCanonEngine: true, factionId: 'iron-sultanate',
    });
  } catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'sim canon con melee no-throw');
  ok(r && ['friendly','enemy','draw'].includes(r.winner),
     'winner válido');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
