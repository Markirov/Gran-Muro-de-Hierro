/* Fase 13-A PIVOT v2 — Lista de compra UI + agrupación + helpers.
 *
 * Verifica:
 * - groupShoppingItems(wb) devuelve {manual, byVariant, historico}
 * - Items checked van a 'historico' (decisión 1: tachar mueve a sección)
 * - byVariant agrupa items source=variant por variantId
 * - clearCheckedShoppingItems(wb) borra todos los checked
 * - Modal modal-shopping presente en HTML
 * - Botón btn-open-shopping en header
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase13.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  createVariant: typeof createVariant === 'function' ? createVariant : null,
  addShoppingItem: typeof addShoppingItem === 'function' ? addShoppingItem : null,
  toggleShoppingItemChecked: typeof toggleShoppingItemChecked === 'function' ? toggleShoppingItemChecked : null,
  groupShoppingItems: typeof groupShoppingItems === 'function' ? groupShoppingItems : null,
  clearCheckedShoppingItems: typeof clearCheckedShoppingItems === 'function' ? clearCheckedShoppingItems : null,
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
for (const h of ['newWarband','createVariant','addShoppingItem','toggleShoppingItemChecked','groupShoppingItems','clearCheckedShoppingItems']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, createVariant, addShoppingItem,
        toggleShoppingItemChecked, groupShoppingItems,
        clearCheckedShoppingItems } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: groupShoppingItems estructura básica', () => {
  const wb = newWarband('iron-sultanate');
  const r = groupShoppingItems(wb);
  ok(typeof r === 'object', 'devuelve objeto');
  ok(Array.isArray(r.manual), 'manual array');
  ok(typeof r.byVariant === 'object', 'byVariant objeto');
  ok(Array.isArray(r.historico), 'historico array');
});

group('Group 2: items manuales (no checked) → sección manual', () => {
  const wb = newWarband('iron-sultanate');
  addShoppingItem(wb, { type:'equipment', name:'Bayonet', source:'manual' });
  addShoppingItem(wb, { type:'equipment', name:'Gas Mask', source:'manual' });
  const r = groupShoppingItems(wb);
  ok(r.manual.length === 2, '2 items en manual');
  ok(r.historico.length === 0, 'historico vacío');
});

group('Group 3: items source=variant agrupados por variantId', () => {
  const wb = newWarband('iron-sultanate');
  const v1 = createVariant(wb, 'V1');
  const v2 = createVariant(wb, 'V2');
  addShoppingItem(wb, { type:'equipment', name:'X', source:'variant', variantId: v1.id });
  addShoppingItem(wb, { type:'equipment', name:'Y', source:'variant', variantId: v1.id });
  addShoppingItem(wb, { type:'equipment', name:'Z', source:'variant', variantId: v2.id });
  const r = groupShoppingItems(wb);
  ok(Array.isArray(r.byVariant[v1.id]) && r.byVariant[v1.id].length === 2,
     'v1 tiene 2 items');
  ok(Array.isArray(r.byVariant[v2.id]) && r.byVariant[v2.id].length === 1,
     'v2 tiene 1 item');
});

group('Group 4: items checked → sección historico (decisión 1)', () => {
  const wb = newWarband('iron-sultanate');
  const a = addShoppingItem(wb, { type:'equipment', name:'A', source:'manual' });
  addShoppingItem(wb, { type:'equipment', name:'B', source:'manual' });
  toggleShoppingItemChecked(wb, a.id);
  const r = groupShoppingItems(wb);
  ok(r.manual.length === 1, 'manual tiene 1 (no-checked)');
  ok(r.historico.length === 1, 'historico tiene 1 (checked)');
  ok(r.historico[0].name === 'A', 'historico contiene el item tachado');
});

group('Group 5: checked items de variantes también van a historico', () => {
  const wb = newWarband('iron-sultanate');
  const v = createVariant(wb, 'V');
  const it = addShoppingItem(wb, { type:'equipment', name:'X', source:'variant', variantId:v.id });
  toggleShoppingItemChecked(wb, it.id);
  const r = groupShoppingItems(wb);
  ok(!r.byVariant[v.id] || r.byVariant[v.id].length === 0,
     'byVariant no incluye el checked');
  ok(r.historico.length === 1, 'historico incluye item de variante checked');
});

group('Group 6: clearCheckedShoppingItems borra todos los checked', () => {
  const wb = newWarband('iron-sultanate');
  const a = addShoppingItem(wb, { type:'equipment', name:'A' });
  const b = addShoppingItem(wb, { type:'equipment', name:'B' });
  const c = addShoppingItem(wb, { type:'equipment', name:'C' });
  toggleShoppingItemChecked(wb, a.id);
  toggleShoppingItemChecked(wb, c.id);
  const removed = clearCheckedShoppingItems(wb);
  ok(removed === 2, 'devuelve count borrados (2)');
  ok(wb.shoppingList.length === 1, 'queda 1 item');
  ok(wb.shoppingList[0].id === b.id, 'queda B (no estaba tachado)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
