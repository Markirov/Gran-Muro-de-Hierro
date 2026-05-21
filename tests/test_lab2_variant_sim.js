/* Lab 2.0 — Sprint 31 — Sandbox loadout (variantes) en Lab 2.0.
 *
 * El sandbox de variantes experimentales (Fase 11-12 PIVOT v2) tiene
 * comparativa Lab abstracto (compareVariantVsCanon). Sprint 31 expone
 * lo mismo en Lab 2.0 spatial: el usuario elige qué versión de la
 * banda usar (canon o variante) en la simulación espacial.
 *
 * Helpers:
 *  - _lab2BandFromVariant(wb, variantId): aplica applyVariantOverrides
 *    y devuelve un array de models en companion-shape, igual que wb.models
 *    pero con los overrides de la variante.
 *
 * UI:
 *  - Dropdown #lab-spatial-loadout en panel espacial con opción "canon"
 *    + 1 opción por cada wb.experimentalVariants[i].name.
 *  - Handler de Run usa _lab2BandFromVariant para friendlyModels si
 *    selección !== 'canon'.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_variant_sim.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband:             typeof newWarband === 'function' ? newWarband : null,
  createVariant:          typeof createVariant === 'function' ? createVariant : null,
  _lab2BandFromVariant:   typeof _lab2BandFromVariant === 'function' ? _lab2BandFromVariant : null,
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
for (const h of ['newWarband','createVariant','_lab2BandFromVariant']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { newWarband, createVariant, _lab2BandFromVariant } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: _lab2BandFromVariant aplica overrides + devuelve models', () => {
  const wb = newWarband('iron-sultanate');
  wb.models = [
    { uid: 'm1', name: 'Silahdar', battlekit: ['old-kit'], companionStats: {} },
    { uid: 'm2', name: 'Azeb', battlekit: ['cheap-kit'], companionStats: {} },
  ];
  const v = createVariant(wb, 'Variante Test');
  v.overrides = [{ type: 'replace-equipment', modelUid: 'm1', oldKitId: 'old-kit', newKitId: 'fancy-kit' }];
  const models = _lab2BandFromVariant(wb, v.id);
  ok(Array.isArray(models), 'devuelve array');
  ok(models.length === 2, '2 modelos');
  const m1 = models.find(m => m.uid === 'm1');
  ok(m1 && m1.battlekit.includes('fancy-kit'), 'override aplicado');
  // Original wb NO mutado.
  ok(wb.models[0].battlekit.includes('old-kit'), 'wb original sin tocar');
});

group('Group 2: _lab2BandFromVariant variantId inexistente → fallback canon', () => {
  const wb = newWarband('iron-sultanate');
  wb.models = [{ uid: 'm1', name: 'X' }];
  const models = _lab2BandFromVariant(wb, 'no-existe');
  ok(Array.isArray(models) && models.length === 1, 'devuelve canon models');
  ok(models[0].uid === 'm1', 'm1 preservado');
});

group('Group 3: UI dropdown loadout en panel espacial', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const sel = doc.getElementById('lab-spatial-loadout');
  ok(!!sel, '#lab-spatial-loadout presente');
});

group('Group 4: handler referencia _lab2BandFromVariant', () => {
  ok(/_lab2BandFromVariant/.test(html), 'script invoca _lab2BandFromVariant');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
