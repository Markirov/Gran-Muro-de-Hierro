/* Fase 11 PIVOT v2: modelo de datos para variantes experimentales + wishlist.
 *
 * Verifica:
 * - newWarband inicializa wb.experimentalVariants y wb.shoppingList vacíos
 * - createVariant(wb, name) añade variante con id único + timestamp
 * - getVariant(wb, id) devuelve la variante o null
 * - addShoppingItem(wb, partial) añade item con id, createdAt, source
 * - toggleShoppingItemChecked(wb, id) flip checked, no borra
 * - removeShoppingItem(wb, id) borra por id
 * - migrateWarband rellena campos faltantes en bandas legacy
 * - persistWarband round-trip preserva ambos campos
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase11.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  migrateWarband: typeof migrateWarband === 'function' ? migrateWarband : null,
  persistWarband: typeof persistWarband === 'function' ? persistWarband : null,
  loadWarband: typeof loadWarband === 'function' ? loadWarband : null,
  createVariant: typeof createVariant === 'function' ? createVariant : null,
  getVariant: typeof getVariant === 'function' ? getVariant : null,
  addShoppingItem: typeof addShoppingItem === 'function' ? addShoppingItem : null,
  removeShoppingItem: typeof removeShoppingItem === 'function' ? removeShoppingItem : null,
  toggleShoppingItemChecked: typeof toggleShoppingItemChecked === 'function' ? toggleShoppingItemChecked : null,
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
for (const h of ['newWarband','migrateWarband','persistWarband','loadWarband','createVariant','getVariant','addShoppingItem','removeShoppingItem','toggleShoppingItemChecked']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, migrateWarband, persistWarband, loadWarband,
        createVariant, getVariant, addShoppingItem, removeShoppingItem,
        toggleShoppingItemChecked } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: newWarband inicializa experimentalVariants + shoppingList', () => {
  const wb = newWarband('iron-sultanate');
  ok(Array.isArray(wb.experimentalVariants), 'experimentalVariants array');
  ok(wb.experimentalVariants.length === 0, 'experimentalVariants vacío');
  ok(Array.isArray(wb.shoppingList), 'shoppingList array');
  ok(wb.shoppingList.length === 0, 'shoppingList vacío');
});

group('Group 2: createVariant añade con id único + timestamp', () => {
  const wb = newWarband('iron-sultanate');
  const v1 = createVariant(wb, 'Long Rifle Build');
  ok(typeof v1.id === 'string' && v1.id.length > 0, 'id string no vacío');
  ok(v1.name === 'Long Rifle Build', 'name correcto');
  ok(typeof v1.createdAt === 'number' || typeof v1.createdAt === 'string',
     'createdAt presente');
  ok(Array.isArray(v1.overrides), 'overrides array');
  ok(wb.experimentalVariants.length === 1, 'variante añadida');

  const v2 = createVariant(wb, 'Pistol Build');
  ok(v2.id !== v1.id, 'ids únicos entre variantes');
  ok(wb.experimentalVariants.length === 2, '2 variantes');
});

group('Group 3: getVariant devuelve variante o null', () => {
  const wb = newWarband('iron-sultanate');
  const v = createVariant(wb, 'Test');
  ok(getVariant(wb, v.id) === v, 'devuelve la misma referencia');
  ok(getVariant(wb, 'no-existe') === null, 'inexistente → null');
});

group('Group 4: addShoppingItem añade con id, createdAt, source', () => {
  const wb = newWarband('iron-sultanate');
  const item = addShoppingItem(wb, { type:'equipment', name:'Gas Mask', source:'manual' });
  ok(typeof item.id === 'string' && item.id.length > 0, 'id presente');
  ok(typeof item.createdAt === 'number' || typeof item.createdAt === 'string',
     'createdAt presente');
  ok(item.source === 'manual', 'source preservado');
  ok(item.checked === false, 'checked default false');
  ok(wb.shoppingList.length === 1, 'item añadido');

  // Default source 'manual' si no se especifica.
  const item2 = addShoppingItem(wb, { type:'equipment', name:'Bayonet' });
  ok(item2.source === 'manual', 'source default = manual');
});

group('Group 5: toggleShoppingItemChecked flip sin borrar', () => {
  const wb = newWarband('iron-sultanate');
  const item = addShoppingItem(wb, { type:'equipment', name:'Bandolier' });
  ok(item.checked === false, 'inicial false');
  toggleShoppingItemChecked(wb, item.id);
  ok(wb.shoppingList[0].checked === true, 'toggled a true');
  toggleShoppingItemChecked(wb, item.id);
  ok(wb.shoppingList[0].checked === false, 'toggled de vuelta a false');
  ok(wb.shoppingList.length === 1, 'item sigue en la lista');
});

group('Group 6: removeShoppingItem borra por id', () => {
  const wb = newWarband('iron-sultanate');
  const a = addShoppingItem(wb, { type:'equipment', name:'A' });
  const b = addShoppingItem(wb, { type:'equipment', name:'B' });
  removeShoppingItem(wb, a.id);
  ok(wb.shoppingList.length === 1, 'queda 1 item');
  ok(wb.shoppingList[0].id === b.id, 'queda B');
});

group('Group 7: migrateWarband rellena campos faltantes en banda legacy', () => {
  // Banda guardada antes de Fase 11 — sin estos campos.
  const legacy = newWarband('iron-sultanate');
  delete legacy.experimentalVariants;
  delete legacy.shoppingList;
  migrateWarband(legacy);
  ok(Array.isArray(legacy.experimentalVariants), 'experimentalVariants rellenado');
  ok(Array.isArray(legacy.shoppingList), 'shoppingList rellenado');
});

group('Group 8: persist round-trip preserva ambos campos', () => {
  const wb = newWarband('iron-sultanate');
  createVariant(wb, 'X');
  addShoppingItem(wb, { type:'equipment', name:'Item Z', source:'manual' });
  persistWarband(wb);
  const loaded = loadWarband(wb.id);
  ok(loaded.experimentalVariants.length === 1, 'variante preservada');
  ok(loaded.experimentalVariants[0].name === 'X', 'variante.name preservado');
  ok(loaded.shoppingList.length === 1, 'shopping preservada');
  ok(loaded.shoppingList[0].name === 'Item Z', 'shopping.name preservado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
