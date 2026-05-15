/* Test for Fase 9: filtros Patron + Glory Items en contexto libre
 *
 * Canon extendido: una banda en partida libre se forrajea entre
 * encargos del Patron — no recibe dados ni habilidades de Patron, y
 * no compra Glory Items hasta volver a campaña.
 *
 * Estado actual del código:
 *   - El wizard renderWizardAdvancements muestra CAMPAIGN_TABLES.advancements
 *     que NO contiene entradas de Patron Skill (esas viven en
 *     CAMPAIGN_TABLES.skillTables y se usan en un flujo separado).
 *   - El QM no se abre actualmente en contexto libre (gate de Fase 4.6).
 *
 * Scope mínimo de la subfase:
 *   - filterAdvancementsForContext(list, context): pure helper.
 *     En 'free' filtra cualquier entry con name que mencione 'Patron'
 *     o category 'patron'. Listo para usarse cuando lo introduzcamos.
 *   - filterUnitsForContext(units, context): pure helper. En 'free'
 *     elimina unidades cuyo currency primario sea '☼' (Glory Items).
 *   - Verificación: CAMPAIGN_TABLES.advancements no tiene Patron
 *     (estado actual + invariante para futuros añadidos).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase9.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  filterAdvancementsForContext: typeof filterAdvancementsForContext === 'function' ? filterAdvancementsForContext : null,
  filterUnitsForContext: typeof filterUnitsForContext === 'function' ? filterUnitsForContext : null,
  CAMPAIGN_TABLES,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { filterAdvancementsForContext, filterUnitsForContext, CAMPAIGN_TABLES } = lib;

if (!filterAdvancementsForContext) { console.error('✗ filterAdvancementsForContext not exported'); process.exit(1); }
if (!filterUnitsForContext) { console.error('✗ filterUnitsForContext not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: invariante — CAMPAIGN_TABLES.advancements sin Patron', () => {
  const names = (CAMPAIGN_TABLES.advancements || []).map(a => a.name);
  ok(!names.some(n => /Patron/i.test(n)),
     'no advancement entry mentions "Patron" (canon-consistent)');
});

/* ------------------------------------------------------------------ */
group('Group 2: filterAdvancementsForContext — campaign passthrough', () => {
  const list = [
    { id:'x', name:'+1 DICE Melee', category:'stat' },
    { id:'y', name:'Patron Skill',  category:'patron' },
  ];
  const r = filterAdvancementsForContext(list, 'campaign');
  ok(r.length === 2, 'campaign keeps everything');
});

group('Group 3: filterAdvancementsForContext — free strips Patron', () => {
  const list = [
    { id:'a', name:'+1 DICE Melee', category:'stat' },
    { id:'b', name:'Patron Skill',  category:'patron' },
    { id:'c', name:'Patron Decree', category:'skill' },  // name matches
    { id:'d', name:'Stand Firm',    category:'skill' },
  ];
  const r = filterAdvancementsForContext(list, 'free');
  ok(r.length === 2, 'two non-patron entries kept');
  ok(r.every(a => a.id === 'a' || a.id === 'd'), 'patron entries dropped (by name OR category)');
});

group('Group 4: filterAdvancementsForContext — defensive', () => {
  ok(Array.isArray(filterAdvancementsForContext(null, 'free')), 'null list → array');
  ok(filterAdvancementsForContext(null, 'free').length === 0, 'null list → empty');
});

/* ------------------------------------------------------------------ */
group('Group 5: filterUnitsForContext — campaign passthrough', () => {
  const units = [
    { id:'x', name:'Soldier', cost:50, currency:'👑' },
    { id:'y', name:'Saintly', cost:1,  currency:'☼' },
  ];
  ok(filterUnitsForContext(units, 'campaign').length === 2, 'campaign keeps both');
});

group('Group 6: filterUnitsForContext — free strips glory currency', () => {
  const units = [
    { id:'x', name:'Soldier', cost:50, currency:'👑' },
    { id:'y', name:'Glory Item', cost:1, currency:'☼' },
    { id:'z', name:'Other',  cost:30, currency:'👑' },
  ];
  const r = filterUnitsForContext(units, 'free');
  ok(r.length === 2, 'two non-glory entries kept');
  ok(r.every(u => u.currency !== '☼'), 'no ☼ entries in free output');
});

group('Group 7: filterUnitsForContext — defensive', () => {
  ok(Array.isArray(filterUnitsForContext(null, 'free')), 'null list → array');
  ok(filterUnitsForContext(undefined, 'free').length === 0, 'undefined → empty');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
