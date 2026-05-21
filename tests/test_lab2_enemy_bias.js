/* Lab 2.0 — Sprint 30 — AI enemy bias distinta.
 *
 * Sprints 3-23 usan chooseActionHeuristic con misma lógica para friendly
 * y enemy. Sprint 30 añade 3 perfiles tácticos opcionales para enemy:
 *
 *  - 'balanced' (default): comportamiento Sprints 3-23 (mismo que friendly).
 *  - 'aggressive': charge range extendido (4" en vez de 3"), favorece melee.
 *  - 'defensive': si hay target en rango ranged, NUNCA charge (siempre shoot).
 *
 * state.enemyAIStyle se setea via createLab2Battle opts o sim opts.
 * chooseActionHeuristic detecta side enemy + estilo y modula.
 *
 * Tests:
 *  - aggressive enemy charge a 4" (no se pasa shoot si melee disponible).
 *  - defensive enemy shoot prioritario aunque enemy esté a 2" (no charge).
 *  - balanced = comportamiento Sprint 10/23.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_enemy_bias.js');
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
group('Group 1: enemy aggressive charge a 4"', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','Aggro')],
    { enemyAIStyle: 'aggressive' });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 14, y: 10 });   // 4" del friendly
  const a = chooseActionHeuristic(s, 'e1', 24);
  ok(a.action === 'charge' || a.action === 'melee',
     'enemy aggressive a 4" → charge/melee (got ' + a.action + ')');
});

group('Group 2: enemy defensive shoot aunque target a 2"', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')],
    [mkModel('e1','Defender', { stats:{ ranged:'+2' } })],
    { enemyAIStyle: 'defensive' });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 12, y: 10 });   // 2" del friendly
  const a = chooseActionHeuristic(s, 'e1', 24);
  ok(a.action === 'shoot',
     'enemy defensive prioriza shoot (got ' + a.action + ')');
});

group('Group 3: enemy balanced = comportamiento default', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','Bal')],
    { enemyAIStyle: 'balanced' });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 12, y: 10 });   // 2" → melee canon
  const a = chooseActionHeuristic(s, 'e1', 24);
  ok(a.action === 'melee' || a.action === 'charge',
     'balanced a 2" → melee/charge (got ' + a.action + ')');
});

group('Group 4: friendly NO afectado por enemyAIStyle', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')],
    { enemyAIStyle: 'defensive' });
  placeModel(s, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(s, 'enemy', 'e1', { x: 12, y: 10 });
  // El friendly debería seguir comportamiento default (melee a 2").
  const a = chooseActionHeuristic(s, 'f1', 24);
  ok(a.action === 'melee' || a.action === 'charge',
     'friendly mantiene default (got ' + a.action + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
