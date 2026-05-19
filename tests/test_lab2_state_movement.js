/* Lab 2.0 — Sprint 2 — Estado de batalla + posiciones + movimiento.
 *
 * Construye sobre Sprint 1 (mapas + helpers geométricos). Añade:
 *
 *  - createLab2Battle(mapId, friendlyModels, enemyModels): estado batalla.
 *  - placeModel(state, side, modelUid, pos): sitúa modelo.
 *  - modelAt(state, pos): devuelve {side, model} en posición o null.
 *  - getModelPosition(state, uid): {x,y} o null.
 *  - canMoveTo(state, uid, pos): valida sin mover (rango + terreno + overlap).
 *  - moveModel(state, uid, pos): mueve si válido, devuelve {ok, error?}.
 *  - getModelMoveBudget(model): parsea stat "6"/Infantry" → 6 pulgadas.
 *  - modelsInRange(state, uid, rangeInches): uids enemigos en rango.
 *  - hasLineOfSightBetween(state, a, b): LoS entre dos modelos por uid.
 *
 * Sin sim loop, sin AI. Esos son sprints 3-4.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_state.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  createLab2Battle:       typeof createLab2Battle === 'function' ? createLab2Battle : null,
  placeModel:             typeof placeModel === 'function' ? placeModel : null,
  modelAt:                typeof modelAt === 'function' ? modelAt : null,
  getModelPosition:       typeof getModelPosition === 'function' ? getModelPosition : null,
  canMoveTo:              typeof canMoveTo === 'function' ? canMoveTo : null,
  moveModel:              typeof moveModel === 'function' ? moveModel : null,
  getModelMoveBudget:     typeof getModelMoveBudget === 'function' ? getModelMoveBudget : null,
  modelsInRange:          typeof modelsInRange === 'function' ? modelsInRange : null,
  hasLineOfSightBetween:  typeof hasLineOfSightBetween === 'function' ? hasLineOfSightBetween : null,
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
for (const h of ['createLab2Battle','placeModel','modelAt','getModelPosition','canMoveTo','moveModel','getModelMoveBudget','modelsInRange','hasLineOfSightBetween']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { createLab2Battle, placeModel, modelAt, getModelPosition, canMoveTo, moveModel, getModelMoveBudget, modelsInRange, hasLineOfSightBetween } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(uid, name, stats = {}) {
  return {
    uid, name,
    companionStats: Object.assign({ move: '6"/Infantry' }, stats),
    companionAbilities: [],
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: getModelMoveBudget parsea stats canon', () => {
  ok(getModelMoveBudget({ companionStats: { move: '6"/Infantry' } }) === 6,
     '6"/Infantry → 6');
  ok(getModelMoveBudget({ companionStats: { move: '8"/Flying' } }) === 8,
     '8"/Flying → 8');
  ok(getModelMoveBudget({ companionStats: { move: '6"' } }) === 6,
     '6" sin sufijo → 6');
  ok(getModelMoveBudget({ companionStats: {} }) === 6,
     'fallback razonable cuando no hay stat (default 6")');
  ok(getModelMoveBudget({}) === 6, 'modelo sin stats → 6 default');
});

group('Group 2: createLab2Battle estructura inicial', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'Friendly A'), mkModel('f2', 'Friendly B')],
    [mkModel('e1', 'Enemy A')]);
  ok(state.mapId === 'open-ground', 'mapId guardado');
  ok(state.map && state.map.width === 48, 'map referenciado');
  ok(state.friendly.models.length === 2, '2 friendly models');
  ok(state.enemy.models.length === 1, '1 enemy model');
  ok(state.turn === 1, 'turn=1 inicial');
  ok(state.activated instanceof Set, 'activated es Set');
});

group('Group 3: placeModel + getModelPosition + modelAt', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'A')], [mkModel('e1', 'B')]);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'enemy', 'e1', { x: 30, y: 20 });
  const pf = getModelPosition(state, 'f1');
  const pe = getModelPosition(state, 'e1');
  ok(pf.x === 5 && pf.y === 5, 'f1 en (5,5)');
  ok(pe.x === 30 && pe.y === 20, 'e1 en (30,20)');
  const at5 = modelAt(state, { x: 5, y: 5 });
  ok(at5 && at5.side === 'friendly' && at5.model.uid === 'f1',
     'modelAt(5,5) → f1 friendly');
  const at30 = modelAt(state, { x: 30, y: 20 });
  ok(at30 && at30.side === 'enemy', 'modelAt(30,20) → enemy');
  const atEmpty = modelAt(state, { x: 0, y: 0 });
  ok(atEmpty === null, 'modelAt vacío → null');
});

group('Group 4: canMoveTo dentro del budget', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'A')], []);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  // Move stat 6"/Infantry. 5" en X → OK.
  const r1 = canMoveTo(state, 'f1', { x: 15, y: 10 });
  ok(r1.ok === true, '5" dentro de budget → OK');
  // 7" → fuera de budget canon (6").
  const r2 = canMoveTo(state, 'f1', { x: 17, y: 10 });
  ok(r2.ok === false, '7" excede budget → reject');
  ok(/budget|movimiento|range/i.test(r2.error || ''),
     'error menciona movimiento/budget');
});

group('Group 5: canMoveTo bloqueado por terreno (ruined-village)', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1', 'A')], []);
  // (10,6) en ruined-village es núcleo de ruina → blocked.
  placeModel(state, 'friendly', 'f1', { x: 8, y: 6 });
  const r = canMoveTo(state, 'f1', { x: 10, y: 6 });
  ok(r.ok === false, 'mover a celda blocked → reject');
  ok(/terreno|blocked|bloqueado/i.test(r.error || ''),
     'error menciona terreno');
});

group('Group 6: canMoveTo bloqueado por modelo presente', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'A'), mkModel('f2', 'B')], []);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  placeModel(state, 'friendly', 'f2', { x: 8, y: 5 });
  const r = canMoveTo(state, 'f1', { x: 8, y: 5 });
  ok(r.ok === false, 'mover a celda ocupada → reject');
  ok(/ocupada|otro modelo|overlap|model/i.test(r.error || ''),
     'error menciona overlap');
});

group('Group 7: moveModel aplica + persiste posición', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'A')], []);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  const r = moveModel(state, 'f1', { x: 13, y: 12 });
  ok(r.ok === true, 'move válido → ok:true');
  const pos = getModelPosition(state, 'f1');
  ok(pos.x === 13 && pos.y === 12, 'posición actualizada');
});

group('Group 8: moveModel reject no muta posición', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'A')], []);
  placeModel(state, 'friendly', 'f1', { x: 5, y: 5 });
  const r = moveModel(state, 'f1', { x: 50, y: 5 });  // fuera de budget Y de mapa
  ok(r.ok === false, 'move excesivo → reject');
  const pos = getModelPosition(state, 'f1');
  ok(pos.x === 5 && pos.y === 5, 'posición sin mutar tras reject');
});

group('Group 9: modelsInRange filtra enemigos por distancia', () => {
  const state = createLab2Battle('open-ground',
    [mkModel('f1', 'Sniper')],
    [mkModel('e1', 'Close'), mkModel('e2', 'Mid'), mkModel('e3', 'Far')]);
  placeModel(state, 'friendly', 'f1', { x: 10, y: 10 });
  placeModel(state, 'enemy', 'e1', { x: 14, y: 10 });   // 4"
  placeModel(state, 'enemy', 'e2', { x: 22, y: 10 });   // 12"
  placeModel(state, 'enemy', 'e3', { x: 40, y: 10 });   // 30"
  const in10 = modelsInRange(state, 'f1', 10);
  ok(in10.includes('e1') && !in10.includes('e2') && !in10.includes('e3'),
     'rango 10" solo incluye e1');
  const in15 = modelsInRange(state, 'f1', 15);
  ok(in15.includes('e1') && in15.includes('e2') && !in15.includes('e3'),
     'rango 15" incluye e1+e2');
  const in40 = modelsInRange(state, 'f1', 40);
  ok(in40.includes('e3'), 'rango 40" incluye e3');
});

group('Group 10: hasLineOfSightBetween respeta mapa', () => {
  const state = createLab2Battle('ruined-village',
    [mkModel('f1', 'A')], [mkModel('e1', 'B')]);
  // Posiciones extremo a extremo con ruinas en medio.
  placeModel(state, 'friendly', 'f1', { x: 5, y: 6 });
  placeModel(state, 'enemy', 'e1', { x: 15, y: 6 });
  // (10,6) es blocked → línea horizontal bloqueada.
  const los = hasLineOfSightBetween(state, 'f1', 'e1');
  ok(los === false, 'LoS bloqueado por ruina en (10,6)');
  // Mover e1 a línea limpia (y=0, sin ruinas en y=0).
  moveModel(state, 'e1', { x: 15, y: 6 });
  // Reposiciona ambos a (0,0) y (10,0) — línea sin obstáculos.
  state.friendly.positions['f1'] = { x: 0, y: 0 };
  state.enemy.positions['e1'] = { x: 10, y: 0 };
  ok(hasLineOfSightBetween(state, 'f1', 'e1') === true,
     'LoS limpio cuando no hay ruinas en la línea');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
