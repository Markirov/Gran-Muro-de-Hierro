/* SPEC-rediseno-ui Sub-tarea H — shoppingList scope field + migración.
 *
 * Verifica:
 * - addShoppingItem default scope='pool' si no se especifica
 * - addShoppingItem con scope='unit' + forModel respeta valores
 * - addShoppingItem con scope='unit' sin forModel → coerce coherente
 * - Migración: item con forModel y sin scope → scope='unit'
 * - Migración: item sin forModel ni scope → scope='pool'
 * - quantity default 1 si no se especifica
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_subH_scope.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  migrateWarband: typeof migrateWarband === 'function' ? migrateWarband : null,
  addShoppingItem: typeof addShoppingItem === 'function' ? addShoppingItem : null,
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
for (const h of ['newWarband','migrateWarband','addShoppingItem']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, migrateWarband, addShoppingItem } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: addShoppingItem default scope=pool', () => {
  const wb = newWarband('heretic-legions');
  const it = addShoppingItem(wb, { type:'equipment', name:'Long Rifle' });
  ok(it.scope === 'pool', 'scope=pool por defecto');
  ok(it.quantity === 1, 'quantity=1 default');
  ok(it.forModel === null, 'forModel=null en pool');
});

group('Group 2: addShoppingItem scope=unit con forModel', () => {
  const wb = newWarband('heretic-legions');
  const it = addShoppingItem(wb, {
    type:'equipment', name:'Heavy Trench Shotgun',
    scope:'unit', forModel:'mod-uid-123',
  });
  ok(it.scope === 'unit', 'scope=unit respetado');
  ok(it.forModel === 'mod-uid-123', 'forModel preservado');
});

group('Group 3: addShoppingItem con forModel pero sin scope explícito → scope=unit', () => {
  const wb = newWarband('heretic-legions');
  // Compat: si especificas forModel pero no scope, deducimos scope='unit'.
  const it = addShoppingItem(wb, {
    type:'equipment', name:'Bayonet', forModel:'mod-abc',
  });
  ok(it.scope === 'unit', 'forModel → scope=unit inferido');
});

group('Group 4: addShoppingItem quantity custom respetado', () => {
  const wb = newWarband('heretic-legions');
  const it = addShoppingItem(wb, {
    type:'equipment', name:'Gas Mask', quantity: 3,
  });
  ok(it.quantity === 3, 'quantity=3 respetado');
});

group('Group 5: migrateWarband añade scope a items legacy', () => {
  const wb = newWarband('heretic-legions');
  // Legacy items sin scope (Fase 11 original).
  wb.shoppingList = [
    { id:'a1', type:'equipment', name:'Rifle', forModel:'mod-x', checked:false },
    { id:'a2', type:'equipment', name:'Bandolier', forModel:null, checked:false },
    { id:'a3', type:'model',     name:'Mercenary',                checked:false },
  ];
  migrateWarband(wb);
  ok(wb.shoppingList[0].scope === 'unit', 'item con forModel → scope=unit');
  ok(wb.shoppingList[1].scope === 'pool', 'item sin forModel → scope=pool');
  ok(wb.shoppingList[2].scope === 'pool', 'item type=model sin forModel → scope=pool');
});

group('Group 6: migrateWarband idempotente — scope existente no se sobreescribe', () => {
  const wb = newWarband('heretic-legions');
  wb.shoppingList = [
    { id:'a1', type:'equipment', name:'X', scope:'unit', forModel:null, checked:false },
  ];
  migrateWarband(wb);
  ok(wb.shoppingList[0].scope === 'unit', 'scope=unit preservado pese a forModel null');
});

group('Group 7: addShoppingItem quantity default rellenado por migración si falta', () => {
  const wb = newWarband('heretic-legions');
  wb.shoppingList = [
    { id:'a1', type:'equipment', name:'X', scope:'pool', forModel:null, checked:false },
  ];
  migrateWarband(wb);
  ok(wb.shoppingList[0].quantity === 1, 'quantity rellenado a 1');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
