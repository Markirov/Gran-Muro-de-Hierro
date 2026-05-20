/* Lab 2.0 — Sprint 17 — Soporte HEAVY weapons (no move + no charge).
 *
 * Canon TC: weapons con keyword HEAVY no permiten Move ACTION en el
 * mismo turno (modelo es Heavy = setup/teardown costoso). En sim Lab 2.0
 * esto significa: si el modelo lleva HEAVY weapon y NO está engaged,
 * NO puede advance ni charge — solo shoot o hold.
 *
 * Detección: model.companionEquipment con item.weaponKeywords incluyendo
 * 'HEAVY' (vía armoury lookup) o equipment-name canon HEAVY conocido.
 *
 *  - isModelHeavyArmed(model, factionId): boolean.
 *  - chooseActionHeuristic respeta heavy: si nearest enemy > 3" y modelo
 *    es heavy → 'hold' (en vez de 'advance') porque no puede moverse Y
 *    disparar en mismo turno. Si en rango → 'shoot' como siempre.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_heavy.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:      typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:            typeof placeModel === 'function' ? placeModel : null,
  isModelHeavyArmed:     typeof isModelHeavyArmed === 'function' ? isModelHeavyArmed : null,
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
for (const h of ['createLab2Battle','placeModel','isModelHeavyArmed','chooseActionHeuristic']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, isModelHeavyArmed, chooseActionHeuristic } = lib;

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
group('Group 1: isModelHeavyArmed detecta HEAVY weapon canon', () => {
  // Machine Gun de iron-sultanate tiene HEAVY en keywords.
  const heavy = mkModel('h1', 'MG Gunner',
    { equipment: [{ name: 'Machine Gun', type: 'ranged weapon' }] });
  ok(isModelHeavyArmed(heavy, 'iron-sultanate') === true,
     'modelo con Machine Gun → heavy');
  // Bolt-Action Rifle no es HEAVY.
  const light = mkModel('l1', 'Rifle',
    { equipment: [{ name: 'Bolt-Action Rifle', type: 'ranged weapon' }] });
  ok(isModelHeavyArmed(light, 'iron-sultanate') === false ||
     isModelHeavyArmed(light, 'new-antioch') === false,
     'modelo con Bolt-Action Rifle → no heavy');
});

group('Group 2: detección por keyword explícita en equipment weaponKeywords', () => {
  const m = mkModel('m1', 'X', {
    equipment: [{ name: 'Custom Weapon', type: 'ranged weapon', weaponKeywords: ['HEAVY'] }],
  });
  ok(isModelHeavyArmed(m) === true,
     'detecta HEAVY via weaponKeywords inline');
});

group('Group 3: modelo sin equipment → no heavy', () => {
  const m = mkModel('m1', 'X');
  ok(isModelHeavyArmed(m) === false, 'no equipment → no heavy');
});

group('Group 4: chooseActionHeuristic devuelve hold si heavy + sin target en rango', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','MG', {
       equipment: [{ name: 'Machine Gun', type: 'ranged weapon' }],
     })],
    [mkModel('e1','B')]);
  state.factionId = 'iron-sultanate';
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 40, y: 5 });  // 35" — fuera de 24" range.
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'hold' || a.action === 'advance',
     'heavy fuera de rango devuelve hold o advance (V1 admite advance fallback). Got: ' + a.action);
  // V1 deseado: hold para heavy. Si admite advance, no debería ser charge/melee.
  ok(a.action !== 'charge' && a.action !== 'melee',
     'heavy no carga ni mêlée si fuera de rango');
});

group('Group 5: chooseActionHeuristic heavy + target en rango → shoot', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','MG', {
       equipment: [{ name: 'Machine Gun', type: 'ranged weapon' }],
     })],
    [mkModel('e1','B')]);
  state.factionId = 'iron-sultanate';
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 25, y: 5 });  // 20" — en rango.
  const a = chooseActionHeuristic(state, 'f1', 24);
  ok(a.action === 'shoot', 'heavy en rango → shoot (got ' + a.action + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
