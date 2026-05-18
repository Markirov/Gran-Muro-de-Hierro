/* SPEC-rediseno-ui Sub-tarea G — render funcional Sub-tab Lista de compra.
 *
 * Verifica salida de renderShoppingSubtab sobre wb.shoppingList con items
 * mezclados (pool + unit, activos + checked, manual + variant):
 *
 * - Lista vacía → mensaje placeholder.
 * - Sin wb → mensaje "Carga una banda primero".
 * - Items pool van bajo sección "POOL DE BANDA".
 * - Items scope=unit van bajo sección con nombre del modelo en uppercase.
 * - Items checked se aíslan en <details> con summary "Histórico".
 * - Items source=variant muestran nombre de variante.
 * - Items con quantity>1 prefijan "N×".
 * - Items con variantId huérfano muestran "Variante eliminada".
 * - Header de sección incluye conteo total (active + checked).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_subG_render.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  STATE,
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  addShoppingItem: typeof addShoppingItem === 'function' ? addShoppingItem : null,
  renderShoppingSubtab: typeof renderShoppingSubtab === 'function' ? renderShoppingSubtab : null,
  _getRenderedHtml: () => globalThis.__shoppingSubtabHtml,
  _setModels: (models) => { STATE.currentWarband.models = models; },
  _setVariants: (vs) => { STATE.currentWarband.experimentalVariants = vs; },
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
globalThis.__shoppingSubtabHtml = '';
const _shoppingEl = {
  style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  addEventListener(){}, removeEventListener(){}, appendChild(){},
  querySelectorAll(){return [];}, querySelector(){return null;},
  setAttribute(){}, getAttribute(){return null;},
  get innerHTML(){ return globalThis.__shoppingSubtabHtml; },
  set innerHTML(v){ globalThis.__shoppingSubtabHtml = v; },
  textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} },
};
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = {
  addEventListener(){}, removeEventListener(){},
  querySelectorAll(){return [];}, querySelector(){return null;},
  getElementById(id){ return id === 'shopping-subtab-content' ? _shoppingEl : fakeEl(); },
  createElement: fakeEl, body:fakeEl(), documentElement:fakeEl(),
};
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['STATE','newWarband','addShoppingItem','renderShoppingSubtab']) {
  if (!lib[h] && h !== 'STATE') { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { STATE, newWarband, addShoppingItem, renderShoppingSubtab, _getRenderedHtml, _setModels, _setVariants } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: sin currentWarband → mensaje carga banda', () => {
  STATE.currentWarband = null;
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/Carga una banda/i.test(out), 'mensaje "Carga una banda primero"');
});

group('Group 2: shoppingList vacía → placeholder', () => {
  STATE.currentWarband = newWarband('heretic-legions');
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/Lista vac[ií]a/i.test(out), 'placeholder lista vacía');
  ok(/A[ñn]adir item/i.test(out), 'hint botón añadir');
});

group('Group 3: items pool aparecen bajo POOL DE BANDA', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  addShoppingItem(wb, { type:'equipment', name:'Long Rifle' });
  addShoppingItem(wb, { type:'equipment', name:'Gas Masks', quantity:3 });
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/POOL DE BANDA/.test(out), 'sección POOL DE BANDA presente');
  ok(/Long Rifle/.test(out), 'Long Rifle listado');
  ok(/3×\s*Gas Masks/.test(out), 'Gas Masks con prefix 3×');
  ok(/POOL DE BANDA[^<]*\(2\)/.test(out), 'header con conteo (2)');
});

group('Group 4: items scope=unit agrupan por modelo', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  _setModels([
    { uid:'mod-witch', name:'Artillery Witch' },
    { uid:'mod-commando', name:'Death Commando' },
  ]);
  addShoppingItem(wb, { type:'equipment', name:'Reinforced Armour', scope:'unit', forModel:'mod-witch' });
  addShoppingItem(wb, { type:'equipment', name:'Heavy Trench Shotgun', scope:'unit', forModel:'mod-commando' });
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/ARTILLERY WITCH/.test(out), 'sección ARTILLERY WITCH (uppercase)');
  ok(/DEATH COMMANDO/.test(out), 'sección DEATH COMMANDO');
  ok(/Reinforced Armour/.test(out), 'item Reinforced Armour listado');
  ok(/Heavy Trench Shotgun/.test(out), 'item Heavy Trench Shotgun listado');
  ok(!/POOL DE BANDA/.test(out), 'sin sección POOL si no hay items pool');
});

group('Group 5: items checked → sección Histórico plegable', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  const i1 = addShoppingItem(wb, { type:'equipment', name:'Bayonet' });
  const i2 = addShoppingItem(wb, { type:'equipment', name:'Old Sword' });
  i2.checked = true;
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/<details/.test(out), '<details> presente para tachados');
  ok(/Hist[oó]rico\s*\(1\s*tachado\)/.test(out), 'summary "Histórico (1 tachado)"');
  ok(/Old Sword/.test(out), 'Old Sword visible dentro details');
  ok(/Bayonet/.test(out), 'Bayonet visible fuera details');
});

group('Group 6: items source=variant muestran nombre variante', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  _setVariants([{ id:'var-tank', name:'Tanque pesado' }]);
  addShoppingItem(wb, {
    type:'equipment', name:'Reinforced Plate',
    source:'variant', variantId:'var-tank',
  });
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/desde variante:\s*Tanque pesado/.test(out), 'label "desde variante: Tanque pesado"');
});

group('Group 7: variantId huérfano → "Variante eliminada"', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  _setVariants([]);
  addShoppingItem(wb, {
    type:'equipment', name:'Orphan Item',
    source:'variant', variantId:'var-missing',
  });
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/Variante eliminada/.test(out), 'label fallback "Variante eliminada"');
});

group('Group 8: mix pool + unit + checked render coherente', () => {
  const wb = newWarband('heretic-legions');
  STATE.currentWarband = wb;
  _setModels([{ uid:'mod-x', name:'Heretic Priest' }]);
  addShoppingItem(wb, { type:'equipment', name:'Pool A' });
  addShoppingItem(wb, { type:'equipment', name:'Pool B' });
  const c = addShoppingItem(wb, { type:'equipment', name:'Pool Tachado' });
  c.checked = true;
  addShoppingItem(wb, { type:'equipment', name:'Unit X', scope:'unit', forModel:'mod-x' });
  renderShoppingSubtab();
  const out = _getRenderedHtml();
  ok(/POOL DE BANDA[^<]*\(3\)/.test(out), 'POOL conteo 3 (2 activos + 1 tachado)');
  ok(/HERETIC PRIEST[^<]*\(1\)/.test(out), 'HERETIC PRIEST conteo 1');
  // Pool active count y checked count separados visualmente.
  const poolIdx = out.indexOf('POOL DE BANDA');
  const priestIdx = out.indexOf('HERETIC PRIEST');
  ok(poolIdx >= 0 && priestIdx > poolIdx, 'orden: Pool primero, modelos después');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
