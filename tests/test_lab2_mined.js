/* Lab 2.0 — Sprint 26 — MINED (band-level state).
 *
 * Canon TC: ciertas bandas (Combat Engineers, Sappers) llegan al tablero
 * con minas premarcadas en deployment zone. Cuando enemy carga sobre
 * zona defensiva, posible MINED trigger → injury roll antes del combat.
 *
 * V1 simplificación:
 *  - state.friendly.minesRemaining / state.enemy.minesRemaining (default 0).
 *  - createLab2Battle acepta opts.friendlyMines / opts.enemyMines.
 *  - chooseActionHeuristic charge: si target side tiene minas restantes y
 *    el attacker no tiene NEGATE MINED, 25% chance pre-charge KO.
 *  - Si proc, attacker se KO antes del melee + side defender pierde una mina.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_mined.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:      typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:            typeof placeModel === 'function' ? placeModel : null,
  triggerMinedCharge:    typeof triggerMinedCharge === 'function' ? triggerMinedCharge : null,
  hasNegateMined:        typeof hasNegateMined === 'function' ? hasNegateMined : null,
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
for (const h of ['createLab2Battle','placeModel','triggerMinedCharge','hasNegateMined','simulateBattleSpatial']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, triggerMinedCharge, hasNegateMined, simulateBattleSpatial } = lib;

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
group('Group 1: createLab2Battle inicializa minesRemaining', () => {
  const s = createLab2Battle('open-ground', [mkModel('f1','A')], [mkModel('e1','B')],
    { friendlyMines: 3, enemyMines: 1 });
  ok(s.friendly.minesRemaining === 3, 'friendly.minesRemaining=3');
  ok(s.enemy.minesRemaining === 1, 'enemy.minesRemaining=1');
});

group('Group 2: createLab2Battle default minas = 0', () => {
  const s = createLab2Battle('open-ground', [mkModel('f1','A')], [mkModel('e1','B')]);
  ok(s.friendly.minesRemaining === 0, 'default 0');
  ok(s.enemy.minesRemaining === 0, 'default 0');
});

group('Group 3: hasNegateMined detecta keyword', () => {
  const m1 = mkModel('m1','A', { keywords: [{ name: 'NEGATE MINED' }] });
  ok(hasNegateMined(m1) === true, 'NEGATE MINED detectado');
  const m2 = mkModel('m2','B', { keywords: [{ name: 'TOUGH' }] });
  ok(hasNegateMined(m2) === false, 'TOUGH != NEGATE MINED');
});

group('Group 4: triggerMinedCharge proc + decrementa minas', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')],
    [mkModel('e1','B')],
    { enemyMines: 2 });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 11, y: 10 });
  const before = s.enemy.minesRemaining;
  const r = triggerMinedCharge(s, 'f1', 'e1', () => 0.10);  // 0.10 < 0.25 → proc
  ok(r.triggered === true, 'mine triggered con rng=0.10');
  ok(s.enemy.minesRemaining === before - 1, 'mina decrementada');
});

group('Group 5: triggerMinedCharge no proc con rng alto', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')],
    { enemyMines: 2 });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 11, y: 10 });
  const r = triggerMinedCharge(s, 'f1', 'e1', () => 0.90);
  ok(r.triggered === false, 'no proc con rng=0.90');
  ok(s.enemy.minesRemaining === 2, 'minas sin tocar');
});

group('Group 6: NEGATE MINED bypassea trigger', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A', { keywords: [{ name: 'NEGATE MINED' }] })],
    [mkModel('e1','B')],
    { enemyMines: 2 });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 11, y: 10 });
  const r = triggerMinedCharge(s, 'f1', 'e1', () => 0.01);
  ok(r.triggered === false, 'NEGATE MINED salta trigger');
  ok(s.enemy.minesRemaining === 2, 'minas no consumidas');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
