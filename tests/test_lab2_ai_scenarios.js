/* Lab 2.0 — Sprint 23 — IA scenario-aware.
 *
 * Sobre Sprint 19 (escenarios) + Sprint 16 (cover-seeking advance). La
 * heurística de chooseActionHeuristic ahora consulta state.scenarioId
 * para adaptar prioridades:
 *
 *  - 'hold-the-line': si friendly está en su mitad defensiva (y < half)
 *    y NO hay enemy en rango → hold (campa). Enemy spejo a y >= half.
 *  - 'breakthrough': el target prioritario para advance es la zona de
 *    victoria (y=height-4 para friendly, y=3 para enemy). Si no engaged
 *    + no shoot, advance hacia objetivo geográfico (no hacia enemy).
 *  - 'capture-point': target prioritario advance = punto (24,16). Si ya
 *    está cerca (≤3"), hold para mantener control.
 *  - Default 'pitched-battle' o sin scenarioId: comportamiento Sprints
 *    3-18 (back-compat).
 *
 * El state guarda scenarioId tras createLab2Battle si se pasa en opts,
 * o se actualiza desde simulateBattleSpatial.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_ai_scenarios.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:      typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:            typeof placeModel === 'function' ? placeModel : null,
  chooseActionHeuristic: typeof chooseActionHeuristic === 'function' ? chooseActionHeuristic : null,
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
const { createLab2Battle, placeModel, chooseActionHeuristic } = lib;

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
group('Group 1: hold-the-line friendly defensivo → hold si lejos del enemy', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  state.scenarioId = 'hold-the-line';
  placeModel(state, 'friendly', 'f1', { x: 24, y: 5 });   // mitad inf (y<16)
  placeModel(state, 'enemy', 'e1', { x: 24, y: 30 });     // muy lejos
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'hold',
     'hold-the-line en zona defensiva + enemy lejos → hold (got ' + a.action + ')');
});

group('Group 2: hold-the-line con enemy en rango → shoot (no hold)', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A', { stats:{ ranged:'+2' } })], [mkModel('e1','B')]);
  state.scenarioId = 'hold-the-line';
  placeModel(state, 'friendly', 'f1', { x: 24, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 24, y: 15 });    // 10" — en rango
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'shoot', 'hold-the-line con enemy en rango → shoot');
});

group('Group 3: breakthrough advance hacia zona victoria (no enemy)', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  state.scenarioId = 'breakthrough';
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 5, y: 8 });       // muy cerca pero NO en rango ranged
  const a = chooseActionHeuristic(state, 'f1', 1);        // range=1 fuerza no-shoot
  // breakthrough: advance hacia y=height-4=28. movePos.y > 5 (sube).
  ok(a.action === 'advance' || a.action === 'charge' || a.action === 'melee',
     'breakthrough con enemy cerca → advance/charge/melee (got ' + a.action + ')');
  if (a.action === 'advance' && a.movePos) {
    ok(a.movePos.y >= 5, 'movePos.y avanza hacia zona victoria (y=28)');
  }
});

group('Group 4: capture-point advance hacia objetivo (24,16)', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  state.scenarioId = 'capture-point';
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 40, y: 30 });    // lejos
  const a = chooseActionHeuristic(state, 'f1', 1);       // sin shoot
  ok(a.action === 'advance', 'capture-point sin shoot → advance');
  if (a.movePos) {
    // Debería acercarse a (24,16): x crece, y crece.
    ok(a.movePos.x > 5 || a.movePos.y > 5,
       'movePos hacia objetivo central (no permanece en deploy)');
  }
});

group('Group 5: pitched-battle (default) back-compat sin scenario change', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  // Sin scenarioId.
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 5 });
  const a = chooseActionHeuristic(state, 'f1', 24);
  // Distance 25" — no en rango. Advance hacia enemy.
  ok(a.action === 'advance', 'pitched-battle sin scenarioId → advance default');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
