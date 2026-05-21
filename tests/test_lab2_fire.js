/* Lab 2.0 — Sprint 28 — FIRE persistente en celdas.
 *
 * Canon TC: FIRE keyword deja marcadores persistentes que dañan modelos
 * en esa celda turno tras turno hasta que el fire se apaga.
 *
 * V1 simplificación:
 *  - state.fireCells: Map "x,y" → { turnsRemaining: N }.
 *  - markFireCell(state, pos, turns=2): pinta celda con N turnos restantes.
 *  - processFireDamage(state, rng): al inicio de cada turno, modelos
 *    sobre fire cells reciben 35% chance de KO (proxy del injury FIRE).
 *  - tickFireCells(state): decrementa turnsRemaining, elimina expiradas.
 *  - Wire en rollSpatialAttack: weapon con FIRE keyword marca celda
 *    del target tras hit.
 *  - Wire en simulateBattleSpatial: process + tick al INICIO de cada turno.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_fire.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:    typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:          typeof placeModel === 'function' ? placeModel : null,
  markFireCell:        typeof markFireCell === 'function' ? markFireCell : null,
  processFireDamage:   typeof processFireDamage === 'function' ? processFireDamage : null,
  tickFireCells:       typeof tickFireCells === 'function' ? tickFireCells : null,
  hasNegateFire:       typeof hasNegateFire === 'function' ? hasNegateFire : null,
  getModelPosition:    typeof getModelPosition === 'function' ? getModelPosition : null,
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
for (const h of ['createLab2Battle','placeModel','markFireCell','processFireDamage','tickFireCells','hasNegateFire','getModelPosition']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, markFireCell, processFireDamage, tickFireCells, hasNegateFire, getModelPosition } = lib;

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
group('Group 1: createLab2Battle inicializa fireCells Map', () => {
  const s = createLab2Battle('open-ground', [mkModel('f1','A')], []);
  ok(s.fireCells && typeof s.fireCells.size === 'number', 'fireCells es Map-like');
  ok(s.fireCells.size === 0, 'fireCells empieza vacío');
});

group('Group 2: markFireCell añade entry con turnsRemaining', () => {
  const s = createLab2Battle('open-ground', [mkModel('f1','A')], []);
  markFireCell(s, { x: 10, y: 5 }, 2);
  ok(s.fireCells.size === 1, '1 fire cell');
  const key = '10,5';
  ok(s.fireCells.has(key), 'key "10,5" presente');
  const e = s.fireCells.get(key);
  ok(e.turnsRemaining === 2, 'turnsRemaining=2');
});

group('Group 3: tickFireCells decrementa + elimina expiradas', () => {
  const s = createLab2Battle('open-ground', [mkModel('f1','A')], []);
  markFireCell(s, { x: 5, y: 5 }, 1);
  markFireCell(s, { x: 6, y: 5 }, 3);
  tickFireCells(s);
  ok(!s.fireCells.has('5,5'), '5,5 expirado tras 1 tick');
  ok(s.fireCells.get('6,5').turnsRemaining === 2, '6,5 ahora 2');
});

group('Group 4: processFireDamage KO modelos sobre fire cells', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')], [mkModel('e1','B')]);
  placeModel(s, 'enemy', 'e1', { x: 10, y: 10 });
  markFireCell(s, { x: 10, y: 10 }, 2);
  const kos = processFireDamage(s, () => 0.01);   // 0.01 < 0.35 → KO
  ok(kos.includes('e1'), 'e1 KO por fire');
  ok(getModelPosition(s, 'e1') === null, 'posición limpiada');
});

group('Group 5: NEGATE FIRE skip damage', () => {
  const s = createLab2Battle('open-ground',
    [mkModel('f1','A')],
    [mkModel('e1','B', { keywords: [{ name: 'NEGATE FIRE' }] })]);
  placeModel(s, 'enemy', 'e1', { x: 10, y: 10 });
  markFireCell(s, { x: 10, y: 10 }, 2);
  const kos = processFireDamage(s, () => 0.01);
  ok(!kos.includes('e1'), 'NEGATE FIRE bypassea damage');
  ok(getModelPosition(s, 'e1') !== null, 'sigue posicionado');
});

group('Group 6: hasNegateFire detecta keyword', () => {
  const m = mkModel('m1','A', { keywords: [{ name: 'NEGATE FIRE' }] });
  ok(hasNegateFire(m) === true, 'NEGATE FIRE detectado');
  const m2 = mkModel('m2','B');
  ok(hasNegateFire(m2) === false, 'sin keyword');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
