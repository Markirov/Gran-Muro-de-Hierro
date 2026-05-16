/* SPEC-rediseno-ui Sub-I — Drag&drop reorden roster + sync refresh TC.
 *
 * Verifica:
 * - reorderWarbandModelByUid mueve modelo de fromIdx a toIdx con position
 * - Mover before/after produce orden correcto
 * - Mismo uid (dragged==target) → no-op
 * - Uid inexistente → no-op
 * - refreshCompanionWarband preserva orden custom por uid
 * - Modelo nuevo de TC va al final tras refresh
 * - Modelo eliminado de TC desaparece sin afectar orden
 * - draggable="true" en roster cards
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_subI_dnd.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  reorderWarbandModelByUid: typeof reorderWarbandModelByUid === 'function' ? reorderWarbandModelByUid : null,
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
for (const h of ['reorderWarbandModelByUid','refreshCompanionWarband','importCompanionWarband']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { reorderWarbandModelByUid, refreshCompanionWarband, importCompanionWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function uids(wb) { return wb.models.map(m => m.uid).join(','); }

/* ------------------------------------------------------------------ */
group('Group 1: reorderWarbandModelByUid mueve before/after', () => {
  const wb = { models: [{uid:'a'},{uid:'b'},{uid:'c'},{uid:'d'}] };
  reorderWarbandModelByUid(wb, 'a', 'c', 'after');
  ok(uids(wb) === 'b,c,a,d', 'a tras c → b,c,a,d');

  const wb2 = { models: [{uid:'a'},{uid:'b'},{uid:'c'},{uid:'d'}] };
  reorderWarbandModelByUid(wb2, 'd', 'b', 'before');
  ok(uids(wb2) === 'a,d,b,c', 'd antes de b → a,d,b,c');
});

group('Group 2: reorder con uid igual → no-op', () => {
  const wb = { models: [{uid:'a'},{uid:'b'},{uid:'c'}] };
  const r = reorderWarbandModelByUid(wb, 'a', 'a', 'before');
  ok(r === false, 'devuelve false');
  ok(uids(wb) === 'a,b,c', 'orden intacto');
});

group('Group 3: reorder con uid inexistente → no-op', () => {
  const wb = { models: [{uid:'a'},{uid:'b'}] };
  ok(reorderWarbandModelByUid(wb, 'x', 'a', 'before') === false, 'fromUid inexistente → false');
  ok(reorderWarbandModelByUid(wb, 'a', 'x', 'before') === false, 'toUid inexistente → false');
  ok(uids(wb) === 'a,b', 'orden intacto');
});

group('Group 4: reorder primer/último modelo', () => {
  const wb = { models: [{uid:'a'},{uid:'b'},{uid:'c'}] };
  reorderWarbandModelByUid(wb, 'c', 'a', 'before');
  ok(uids(wb) === 'c,a,b', 'mover último al principio');
});

group('Group 5: refreshCompanionWarband preserva orden custom por uid', () => {
  const validJson = {
    'warband-id':'wb-1', 'warband-name':'Test', 'ducat-rating':700,
    'glory-rating':0, 'glory-bank':0, 'ducat-bank':100,
    'models':[
      { 'model-id':'m1', 'name':'A', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
      { 'model-id':'m2', 'name':'B', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
      { 'model-id':'m3', 'name':'C', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
    ],
  };
  const wb = importCompanionWarband(validJson);
  // Marcos reordena: original era A,B,C; lo dejamos como C,A,B.
  const uidA = wb.models[0].uid, uidB = wb.models[1].uid, uidC = wb.models[2].uid;
  wb.models = [wb.models[2], wb.models[0], wb.models[1]];

  // Refresh con mismo JSON (sin cambios en TC).
  refreshCompanionWarband(wb, validJson);
  ok(wb.models[0].uid === uidC && wb.models[1].uid === uidA && wb.models[2].uid === uidB,
     'orden custom preservado tras refresh sin cambios');
});

group('Group 6: refresh con modelo NUEVO en TC → va al final', () => {
  const baseJson = {
    'warband-id':'wb-2', 'warband-name':'Test', 'ducat-rating':700,
    'glory-rating':0, 'glory-bank':0, 'ducat-bank':100,
    'models':[
      { 'model-id':'m1', 'name':'A', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
      { 'model-id':'m2', 'name':'B', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
    ],
  };
  const wb = importCompanionWarband(baseJson);
  const uidA = wb.models[0].uid, uidB = wb.models[1].uid;
  wb.models = [wb.models[1], wb.models[0]];  // Marcos prefiere B,A

  const newJson = JSON.parse(JSON.stringify(baseJson));
  newJson.models.push({ 'model-id':'m3', 'name':'C', 'cost':50,
                        'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] });
  refreshCompanionWarband(wb, newJson);
  ok(wb.models[0].uid === uidB, 'B sigue primero');
  ok(wb.models[1].uid === uidA, 'A sigue segundo');
  ok(wb.models[2].name === 'C' || wb.models[2].companionRef === 'm3',
     'C (nuevo) al final');
  ok(wb.models.length === 3, '3 modelos total');
});

group('Group 7: refresh con modelo ELIMINADO de TC → desaparece', () => {
  const baseJson = {
    'warband-id':'wb-3', 'warband-name':'Test', 'ducat-rating':700,
    'glory-rating':0, 'glory-bank':0, 'ducat-bank':100,
    'models':[
      { 'model-id':'m1', 'name':'A', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
      { 'model-id':'m2', 'name':'B', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
      { 'model-id':'m3', 'name':'C', 'cost':100, 'stats':{}, 'equipment':[], 'keywords':[], 'abilities':[] },
    ],
  };
  const wb = importCompanionWarband(baseJson);
  // Reordena a B,C,A.
  wb.models = [wb.models[1], wb.models[2], wb.models[0]];

  const newJson = JSON.parse(JSON.stringify(baseJson));
  newJson.models = newJson.models.filter(m => m['model-id'] !== 'm2');  // elimina B
  refreshCompanionWarband(wb, newJson);
  ok(wb.models.length === 2, 'queda 2 modelos');
  // Sin B, el orden previo era B,C,A → ahora C,A.
  const names = wb.models.map(m => m.name);
  ok(names.includes('A') && names.includes('C') && !names.includes('B'),
     'A y C presentes, B fuera');
});

group('Group 8: roster cards renderizan draggable="true"', () => {
  ok(/card\.draggable\s*=\s*true.*Sub-I/.test(html), 'rosterCardCompanion draggable');
  // Doble chequeo del nativo rosterCard también.
  const matches = (html.match(/card\.draggable\s*=\s*true/g) || []);
  ok(matches.length >= 2, 'ambos rosterCard + rosterCardCompanion (got ' + matches.length + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
