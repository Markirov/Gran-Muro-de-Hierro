/* Sub-Fase 11.5 PIVOT v2 — refreshCompanionWarband acepta opts de
 * preservación selectiva (decisión 5 del PIVOT v2).
 *
 * refreshCompanionWarband(wb, newJson, opts?)
 *   opts: { experimentalVariants:bool, shoppingList:bool, freeBattles:bool,
 *           campaignIds:bool, discoveredLocations:bool }
 *   - Si una opción es false, ese campo se RESETEA al refrescar.
 *   - Sin opts → preserva todo (back-compat).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_refresh_opts.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  refreshCompanionWarband: typeof refreshCompanionWarband === 'function' ? refreshCompanionWarband : null,
  importCompanionWarband: typeof importCompanionWarband === 'function' ? importCompanionWarband : null,
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
const { refreshCompanionWarband, importCompanionWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const validJson = {
  'warband-id':'wb-1', 'warband-name':'Test', 'ducat-rating':700,
  'glory-rating':0, 'glory-bank':0, 'ducat-bank':100,
  'models':[{ 'model-id':'m1', 'name':'M1', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] }],
};

function buildWb() {
  const wb = importCompanionWarband(validJson);
  wb.experimentalVariants = [{ id:'v1', name:'V1' }];
  wb.shoppingList = [{ id:'s1', name:'Item' }];
  wb.freeBattles = [{ id:'fb1' }];
  wb.campaignIds = ['c1'];
  wb.discoveredLocations = ['loc1'];
  return wb;
}

/* ------------------------------------------------------------------ */
group('Group 1: sin opts (back-compat) preserva todo', () => {
  const wb = buildWb();
  const r = refreshCompanionWarband(wb, validJson);
  ok(r.ok === true, 'refresh OK');
  ok(wb.experimentalVariants.length === 1, 'variants preservado');
  ok(wb.shoppingList.length === 1, 'shopping preservado');
  ok(wb.freeBattles.length === 1, 'freeBattles preservado');
  ok(wb.campaignIds.length === 1, 'campaignIds preservado');
  ok(wb.discoveredLocations.length === 1, 'discoveredLocations preservado');
});

group('Group 2: opts.experimentalVariants=false descarta variantes', () => {
  const wb = buildWb();
  refreshCompanionWarband(wb, validJson, { experimentalVariants: false });
  ok(Array.isArray(wb.experimentalVariants) && wb.experimentalVariants.length === 0,
     'variants reseteado a []');
  ok(wb.shoppingList.length === 1, 'shopping intacto (no opt)');
});

group('Group 3: opts.shoppingList=false descarta wishlist', () => {
  const wb = buildWb();
  refreshCompanionWarband(wb, validJson, { shoppingList: false });
  ok(wb.shoppingList.length === 0, 'shopping reseteado');
  ok(wb.experimentalVariants.length === 1, 'variants intacto');
});

group('Group 4: opts múltiples = false combinados', () => {
  const wb = buildWb();
  refreshCompanionWarband(wb, validJson, {
    experimentalVariants: false, shoppingList: false, freeBattles: false,
  });
  ok(wb.experimentalVariants.length === 0, 'variants reseteado');
  ok(wb.shoppingList.length === 0, 'shopping reseteado');
  ok(wb.freeBattles.length === 0, 'freeBattles reseteado');
  ok(wb.campaignIds.length === 1, 'campaignIds intacto (no opt false)');
  ok(wb.discoveredLocations.length === 1, 'discoveredLocations intacto');
});

group('Group 5: opts.experimentalVariants=true (explícito) preserva', () => {
  const wb = buildWb();
  refreshCompanionWarband(wb, validJson, { experimentalVariants: true });
  ok(wb.experimentalVariants.length === 1, 'preservado con true explícito');
});

group('Group 6: error JSON no afecta opts handling', () => {
  const wb = buildWb();
  const r = refreshCompanionWarband(wb, { models:[] }, { shoppingList: false });
  ok(r.ok === false, 'rechaza JSON sin warband-id');
  ok(wb.shoppingList.length === 1, 'shopping intacto si validación falla');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
