/* Fase 10 PIVOT v2: desactivar validación oficial estricta.
 *
 * Verifica:
 * - modelCost prefiere model.companionCost si existe (banda viene de TC)
 * - warbandTotals usa esos costes correctamente
 * - canAddUnitWithWarning devuelve {canAdd:true|false, warning?} sin bloquear
 * - Cuando wb.companionSource existe, duplicar nunca bloquea (solo warning)
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase10.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  modelCost: typeof modelCost === 'function' ? modelCost : null,
  warbandTotals: typeof warbandTotals === 'function' ? warbandTotals : null,
  canAddUnit: typeof canAddUnit === 'function' ? canAddUnit : null,
  canAddUnitWithWarning: typeof canAddUnitWithWarning === 'function' ? canAddUnitWithWarning : null,
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
for (const h of ['modelCost','warbandTotals','canAddUnit','canAddUnitWithWarning']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { modelCost, warbandTotals, canAddUnit, canAddUnitWithWarning } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: modelCost prefiere companionCost si existe', () => {
  // Modelo de Companion con unitId desconocido — modelCost legacy daría 0,0.
  // Con preferencia companionCost, devuelve 144.
  const m = {
    name:'Silahdar', uid:'m1',
    unitId:'no-existe-en-canon',
    companionCost: 144, companionGlory: 0,
  };
  const c = modelCost(m, 'iron-sultanate');
  ok(c.ducados === 144, 'usa companionCost (144) en vez de 0');
  ok(c.glory === 0, 'glory 0');
});

group('Group 2: modelCost con companionGlory', () => {
  const m = { name:'X', unitId:'unknown', companionCost: 0, companionGlory: 5 };
  const c = modelCost(m, 'iron-sultanate');
  ok(c.glory === 5, 'usa companionGlory (5)');
});

group('Group 3: modelCost fallback legacy cuando NO hay companion data', () => {
  // Modelo nativo (sin companionCost) — fallback a getUnit del catálogo.
  const m = { name:'X', unitId:'unknown-too' };
  const c = modelCost(m, 'iron-sultanate');
  ok(c.ducados === 0 && c.glory === 0, 'sin companion data + unitId no encontrado → 0,0');
});

group('Group 4: warbandTotals suma costes companion correctamente', () => {
  const wb = {
    factionId: 'iron-sultanate',
    models: [
      { unitId:'a', companionCost: 100, companionGlory: 0 },
      { unitId:'b', companionCost: 200, companionGlory: 1 },
      { unitId:'c', companionCost: 50,  companionGlory: 0 },
    ],
  };
  const t = warbandTotals(wb);
  ok(t.ducados === 350, 'ducados=350 (100+200+50)');
  ok(t.glory === 1, 'glory=1');
});

group('Group 5: canAddUnitWithWarning estructura {canAdd, warning}', () => {
  const wb = { factionId:'iron-sultanate', variantId:'', models:[], companionSource:null };
  const unit = { id:'x', limit:'0-3' };
  const r = canAddUnitWithWarning(wb, unit);
  ok(typeof r === 'object', 'devuelve objeto');
  ok('canAdd' in r, 'tiene canAdd');
  ok(typeof r.canAdd === 'boolean', 'canAdd es boolean');
});

group('Group 6: companionSource → canAddUnitWithWarning permite con warning', () => {
  // Banda Companion con límite excedido (3 ya, intenta 4to).
  const wb = {
    factionId: 'iron-sultanate', variantId: '',
    companionSource: { 'warband-id':'wb1' },
    models: [
      { unitId:'foo' }, { unitId:'foo' }, { unitId:'foo' },
    ],
  };
  const unit = { id:'foo', limit:'0-3', name:'Foo' };
  const r = canAddUnitWithWarning(wb, unit);
  // Banda Companion = permite todo, con warning si fuera de regla.
  ok(r.canAdd === true, 'banda Companion permite añadir aunque exceda límite');
  ok(typeof r.warning === 'string' && r.warning.length > 0,
     'pero devuelve warning informativo');
});

group('Group 7: banda local (sin companionSource) sigue bloqueando', () => {
  const wb = {
    factionId: 'iron-sultanate', variantId: '',
    models: [
      { unitId:'foo' }, { unitId:'foo' }, { unitId:'foo' },
    ],
  };
  const unit = { id:'foo', limit:'0-3', name:'Foo' };
  const r = canAddUnitWithWarning(wb, unit);
  ok(r.canAdd === false, 'sin companionSource bloquea al exceder límite');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
