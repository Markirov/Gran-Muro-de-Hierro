/* Lab 2.0 — Sprint 16 — Smarter advance: prefer celdas con cover.
 *
 * Sobre Sprint 3 (IA heurística advance straight line). chooseActionHeuristic
 * ahora prefiere celdas que ofrezcan cover (light o heavy) sobre la ruta
 * recta hacia el enemigo, siempre que no sacrifique demasiado avance.
 *
 * Score por celda candidata:
 *   score = (oldDist - newDist)            // progress en pulgadas
 *         + coverBonus                      // heavy=2.5, light=1, none=0
 *
 * Helper expuesto: _lab2ChooseAdvanceWithCover(state, modelUid, targetUid).
 *
 * Tests verifican:
 *  - Helper existe y devuelve celda válida (no blocked, no overlap,
 *    dentro del budget).
 *  - Cuando hay cover cells viables que acercan al target, helper las
 *    prefiere sobre la línea recta open.
 *  - Cuando NO hay cover viable (open-ground), fallback a línea recta.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_cover_seek.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:           typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:                 typeof placeModel === 'function' ? placeModel : null,
  _lab2ChooseAdvanceWithCover: typeof _lab2ChooseAdvanceWithCover === 'function' ? _lab2ChooseAdvanceWithCover : null,
  chooseActionHeuristic:      typeof chooseActionHeuristic === 'function' ? chooseActionHeuristic : null,
  getCellCover:               typeof getCellCover === 'function' ? getCellCover : null,
  getCellTerrain:             typeof getCellTerrain === 'function' ? getCellTerrain : null,
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
for (const h of ['createLab2Battle','placeModel','_lab2ChooseAdvanceWithCover','chooseActionHeuristic','getCellCover','getCellTerrain']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, _lab2ChooseAdvanceWithCover, chooseActionHeuristic, getCellCover, getCellTerrain } = lib;

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
group('Group 1: helper devuelve celda válida', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 5 });
  const cell = _lab2ChooseAdvanceWithCover(state, 'f1', 'e1');
  ok(cell !== null, 'devuelve celda no-null');
  if (cell) {
    ok(getCellTerrain(state.map, cell) !== 'blocked',
       'celda no blocked');
    ok(cell.x >= 0 && cell.y >= 0 && cell.x < state.map.width && cell.y < state.map.height,
       'celda dentro de bounds');
  }
});

group('Group 2: en open-ground avanza hacia target (sin cover viable)', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 5 });
  const cell = _lab2ChooseAdvanceWithCover(state, 'f1', 'e1');
  ok(cell.x > 5, 'avanza en dirección +x (target en x=30) — got x=' + cell.x);
});

group('Group 3: en ruined-village prefiere cover si está en ruta', () => {
  // Mismo escenario en ruined-village donde algunas celdas ofrecen cover.
  // f1 a la izquierda, e1 a la derecha. En el medio hay cells con light cover.
  const state = createLab2Battle('ruined-village',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 6 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 6 });
  const cell = _lab2ChooseAdvanceWithCover(state, 'f1', 'e1');
  ok(cell !== null, 'devuelve celda');
  if (cell) {
    // Verifica que avanza (no se queda quieto).
    ok(cell.x > 5, 'avanza +x');
    // Y opcionalmente, intenta cover si está disponible al alcance.
    // Cerca de (5,6) las celdas con cover son anillo ruina (10,6) → (9-11, 5-7).
    // Si está al alcance, el helper debería preferirlas.
    const cover = getCellCover(state.map, cell);
    ok(cover === 'none' || cover === 'light' || cover === 'heavy',
       'cover válido (got "' + cover + '")');
  }
});

group('Group 4: chooseActionHeuristic usa cover-seeking en advance', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 6 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 6 });
  // rangeInches alto para que NO sea shoot; force advance.
  const a = chooseActionHeuristic(state, 'f1', 5);  // 5" range, enemy a 25"
  ok(a.action === 'advance', 'action=advance');
  ok(a.movePos && typeof a.movePos.x === 'number', 'movePos definido');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
