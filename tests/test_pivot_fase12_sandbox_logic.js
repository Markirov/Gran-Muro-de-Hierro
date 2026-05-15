/* Fase 12 PIVOT v2 — Sandbox lógica pura (sin UI).
 *
 * Verifica:
 * - applyVariantOverrides(wb, variantId) devuelve banda clon con overrides
 * - Banda canon NUNCA se muta (clon profundo)
 * - getVariantDiff(wb, variantId) clasifica cambios (added/removed/replaced)
 * - promoteVariantToShoppingList(wb, variantId) añade items con
 *   source='variant' y referencia a variantId
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase12.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  createVariant: typeof createVariant === 'function' ? createVariant : null,
  applyVariantOverrides: typeof applyVariantOverrides === 'function' ? applyVariantOverrides : null,
  getVariantDiff: typeof getVariantDiff === 'function' ? getVariantDiff : null,
  promoteVariantToShoppingList: typeof promoteVariantToShoppingList === 'function' ? promoteVariantToShoppingList : null,
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
for (const h of ['newWarband','createVariant','applyVariantOverrides','getVariantDiff','promoteVariantToShoppingList']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, createVariant, applyVariantOverrides,
        getVariantDiff, promoteVariantToShoppingList } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function buildBand() {
  const wb = newWarband('iron-sultanate');
  wb.models = [
    { uid:'mod1', name:'Silahdar', unitId:'silahdar', battlekit:['halberd-gun'], upgrades:[] },
    { uid:'mod2', name:'Azeb',     unitId:'azeb',     battlekit:['rifle'],       upgrades:[] },
  ];
  return wb;
}

/* ------------------------------------------------------------------ */
group('Group 1: applyVariantOverrides — banda canon no muta', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Long Rifle');
  v.overrides.push({ type:'replace-equipment', modelUid:'mod1',
                     oldKitId:'halberd-gun', newKitId:'long-rifle' });
  const result = applyVariantOverrides(wb, v.id);
  ok(result !== wb, 'devuelve objeto distinto (clon)');
  ok(wb.models[0].battlekit[0] === 'halberd-gun', 'canon mod1 intacto');
  ok(result.models[0].battlekit[0] === 'long-rifle', 'clon mod1 con override');
});

group('Group 2: applyVariantOverrides add-equipment', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Plus Bayonet');
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'bayonet' });
  const result = applyVariantOverrides(wb, v.id);
  ok(result.models[0].battlekit.includes('bayonet'), 'bayonet añadido al clon');
  ok(!wb.models[0].battlekit.includes('bayonet'), 'canon no muta');
});

group('Group 3: applyVariantOverrides remove-equipment', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'No Rifle');
  v.overrides.push({ type:'remove-equipment', modelUid:'mod2', kitId:'rifle' });
  const result = applyVariantOverrides(wb, v.id);
  ok(!result.models[1].battlekit.includes('rifle'), 'rifle eliminado del clon');
  ok(wb.models[1].battlekit.includes('rifle'), 'canon mod2 intacto');
});

group('Group 4: applyVariantOverrides add-model', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Add Recruit');
  v.overrides.push({ type:'add-model', model:{ uid:'mod3', name:'Recruit', unitId:'azeb', battlekit:[], upgrades:[] } });
  const result = applyVariantOverrides(wb, v.id);
  ok(result.models.length === 3, 'clon tiene 3 modelos');
  ok(wb.models.length === 2, 'canon sigue con 2');
  ok(result.models[2].name === 'Recruit', 'recruit añadido');
});

group('Group 5: applyVariantOverrides remove-model', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Drop Azeb');
  v.overrides.push({ type:'remove-model', modelUid:'mod2' });
  const result = applyVariantOverrides(wb, v.id);
  ok(result.models.length === 1, 'clon sin mod2');
  ok(result.models[0].uid === 'mod1', 'queda mod1');
  ok(wb.models.length === 2, 'canon intacto');
});

group('Group 6: getVariantDiff clasifica cambios', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Multi');
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'gas-mask' });
  v.overrides.push({ type:'remove-equipment', modelUid:'mod2', kitId:'rifle' });
  v.overrides.push({ type:'add-model', model:{ uid:'mod3', name:'New' } });
  const diff = getVariantDiff(wb, v.id);
  ok(typeof diff === 'object', 'devuelve objeto');
  ok(Array.isArray(diff.added) && diff.added.length >= 1, 'added array');
  ok(Array.isArray(diff.removed) && diff.removed.length >= 1, 'removed array');
});

group('Group 7: promoteVariantToShoppingList añade items con source variant', () => {
  const wb = buildBand();
  const v = createVariant(wb, 'Promote');
  v.overrides.push({ type:'add-equipment', modelUid:'mod1', kitId:'gas-mask' });
  v.overrides.push({ type:'add-model', model:{ uid:'mod3', unitId:'azeb', name:'Recruit' } });
  const items = promoteVariantToShoppingList(wb, v.id);
  ok(Array.isArray(items), 'devuelve array');
  ok(items.length >= 2, 'al menos 2 items (gas-mask + recruit)');
  for (const it of items) {
    ok(it.source === 'variant', 'item.source = variant');
    ok(it.variantId === v.id, 'item.variantId = ' + v.id);
  }
  ok(wb.shoppingList.length === items.length, 'shoppingList contiene items promovidos');
});

group('Group 8: variante inexistente → applyVariantOverrides devuelve wb sin tocar', () => {
  const wb = buildBand();
  const r = applyVariantOverrides(wb, 'no-existe');
  // Spec: si variante no existe, devuelve clon de canon sin overrides
  // (semánticamente: "vista del canon").
  ok(r !== wb, 'devuelve clon aunque variante no exista');
  ok(r.models.length === wb.models.length, 'misma estructura');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
