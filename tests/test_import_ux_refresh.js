/* Fase 9-A: UX import desde TC — validación + refresh preservando estado local.
 *
 * Verifica:
 * - parseCompanionJson valida warband-id (mensaje claro si falta)
 * - parseCompanionJson valida models presente
 * - refreshCompanionWarband(wb, newJson) re-importa preservando
 *   experimentalVariants + shoppingList del wb antiguo
 * - Preserva wb.id (no rotación)
 * - Devuelve error si newJson inválido (no muta wb original)
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_import_ux.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  parseCompanionJson: typeof parseCompanionJson === 'function' ? parseCompanionJson : null,
  importCompanionWarband: typeof importCompanionWarband === 'function' ? importCompanionWarband : null,
  refreshCompanionWarband: typeof refreshCompanionWarband === 'function' ? refreshCompanionWarband : null,
  newWarband: typeof newWarband === 'function' ? newWarband : null,
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
for (const h of ['parseCompanionJson','importCompanionWarband','refreshCompanionWarband','newWarband']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { parseCompanionJson, importCompanionWarband, refreshCompanionWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* Fixture JSON Companion mínimo válido. */
const validJson = {
  'warband-id': 'wb-test-123',
  'warband-name': 'Test Warband',
  'ducat-rating': 700,
  'glory-rating': 0,
  'glory-bank': 0,
  'ducat-bank': 100,
  'models': [
    { 'model-id': 'm1', 'name': 'Test Model', 'cost': 100,
      'stats': {}, 'equipment': [], 'keywords': [], 'abilities': [] },
  ],
};

/* ------------------------------------------------------------------ */
group('Group 1: parseCompanionJson valida warband-id', () => {
  // Sin warband-id.
  const noId = JSON.parse(JSON.stringify(validJson));
  delete noId['warband-id'];
  const r = parseCompanionJson(JSON.stringify(noId));
  ok(r.ok === false, 'rechazado sin warband-id');
  ok(/warband-id/i.test(r.error || ''), 'mensaje menciona warband-id');
});

group('Group 2: parseCompanionJson valida models presente', () => {
  const noModels = JSON.parse(JSON.stringify(validJson));
  delete noModels['models'];
  const r = parseCompanionJson(JSON.stringify(noModels));
  ok(r.ok === false, 'rechazado sin models');
  ok(/models/i.test(r.error || ''), 'mensaje menciona models');
});

group('Group 3: parseCompanionJson acepta JSON válido', () => {
  const r = parseCompanionJson(JSON.stringify(validJson));
  ok(r.ok === true, 'acepta JSON válido');
  ok(r.data['warband-id'] === 'wb-test-123', 'data warband-id presente');
});

group('Group 4: refreshCompanionWarband preserva experimentalVariants + shoppingList', () => {
  const wb = importCompanionWarband(validJson);
  // Setea estado local que Fase 11 introducirá oficialmente — Fase 9 sólo
  // debe preservar lo que encuentra, agnóstico al schema concreto.
  wb.experimentalVariants = [{ id:'v1', name:'Long Rifle Build' }];
  wb.shoppingList = [{ id:'s1', name:'Gas Mask', checked:false }];
  const origId = wb.id;

  // Nuevo JSON con un modelo extra (simula edición en TC).
  const newJson = JSON.parse(JSON.stringify(validJson));
  newJson['ducat-rating'] = 850;
  newJson.models.push({ 'model-id':'m2', 'name':'Recruit', 'cost':150,
                        'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] });

  const result = refreshCompanionWarband(wb, newJson);
  ok(result && result.ok === true, 'refresh OK');
  ok(wb.id === origId, 'wb.id preservado');
  ok(Array.isArray(wb.experimentalVariants) && wb.experimentalVariants.length === 1,
     'experimentalVariants preservado');
  ok(wb.experimentalVariants[0].name === 'Long Rifle Build', 'variante intacta');
  ok(Array.isArray(wb.shoppingList) && wb.shoppingList.length === 1,
     'shoppingList preservado');
  ok(wb.shoppingList[0].name === 'Gas Mask', 'shopping item intacto');
  ok(wb.budgetTotal === 850, 'budgetTotal actualizado al nuevo JSON');
  ok(wb.models.length === 2, 'models del nuevo JSON aplicados');
});

group('Group 5: refreshCompanionWarband rechaza JSON inválido sin mutar wb', () => {
  const wb = importCompanionWarband(validJson);
  const origName = wb.name;
  const origModels = wb.models.length;

  const broken = { 'warband-name':'No id', models:[] };  // sin warband-id
  const result = refreshCompanionWarband(wb, broken);
  ok(result && result.ok === false, 'devuelve {ok:false}');
  ok(typeof result.error === 'string' && result.error.length > 0, 'error con mensaje');
  ok(wb.name === origName, 'wb.name no mutado');
  ok(wb.models.length === origModels, 'wb.models no mutado');
});

group('Group 6: refreshCompanionWarband desde string JSON también', () => {
  const wb = importCompanionWarband(validJson);
  const newJson = JSON.parse(JSON.stringify(validJson));
  newJson['warband-name'] = 'Renamed Warband';
  const result = refreshCompanionWarband(wb, JSON.stringify(newJson));
  ok(result && result.ok === true, 'acepta string JSON');
  ok(wb.name === 'Renamed Warband', 'nombre actualizado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
