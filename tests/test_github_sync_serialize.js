/* Sub-GH-A — Serialización/deserialización del estado de la app.
 *
 * Verifica:
 * - serializeAppState() devuelve objeto con version, exportedAt, warbands, campaigns, settings
 * - Recoge todas las bandas (keys wf_warband_*)
 * - Recoge todas las campañas (keys wf_campaign_*)
 * - Recoge settings UI (sub-tab, sidebar, tour seen)
 * - deserializeAppState(json) escribe todo a localStorage
 * - Round-trip preserva datos
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_gh_serialize.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  serializeAppState: typeof serializeAppState === 'function' ? serializeAppState : null,
  deserializeAppState: typeof deserializeAppState === 'function' ? deserializeAppState : null,
  localStorage,
};
`;
const stub = `
let lsStore = {};
const localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(lsStore, k) ? lsStore[k] : null; },
  setItem(k, v) { lsStore[k] = String(v); },
  removeItem(k) { delete lsStore[k]; },
  clear() { lsStore = {}; },
  key(i) { return Object.keys(lsStore)[i] || null; },
  get length() { return Object.keys(lsStore).length; },
};
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['serializeAppState','deserializeAppState','localStorage']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { serializeAppState, deserializeAppState, localStorage } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: serializeAppState estructura', () => {
  localStorage.clear();
  const s = serializeAppState();
  ok(typeof s === 'object', 'devuelve objeto');
  ok(typeof s.version === 'string' || typeof s.version === 'number', 'version presente');
  ok(typeof s.exportedAt === 'string', 'exportedAt ISO timestamp');
  ok(Array.isArray(s.warbands), 'warbands array');
  ok(Array.isArray(s.campaigns), 'campaigns array');
  ok(typeof s.settings === 'object', 'settings objeto');
});

group('Group 2: serializeAppState recoge bandas (prefix warband-forge-v1:)', () => {
  localStorage.clear();
  localStorage.setItem('warband-forge-v1:wb1', JSON.stringify({ id:'wb1', name:'A', models:[] }));
  localStorage.setItem('warband-forge-v1:wb2', JSON.stringify({ id:'wb2', name:'B', models:[] }));
  localStorage.setItem('warband-forge-index', JSON.stringify([{id:'wb1'},{id:'wb2'}]));
  localStorage.setItem('something_else', 'ignored');
  const s = serializeAppState();
  ok(s.warbands.length === 2, 'recoge 2 bandas');
  const ids = s.warbands.map(w => w.id).sort();
  ok(ids[0] === 'wb1' && ids[1] === 'wb2', 'ids correctos');
});

group('Group 3: serializeAppState recoge campañas (prefix v1:cmp:)', () => {
  localStorage.clear();
  localStorage.setItem('warband-forge-v1:cmp:c1', JSON.stringify({ id:'c1', name:'Test' }));
  localStorage.setItem('warband-forge-campaigns-index', JSON.stringify([{id:'c1'}]));
  const s = serializeAppState();
  ok(s.campaigns.length === 1, 'recoge 1 campaña');
  ok(s.campaigns[0].id === 'c1', 'id correcto');
});

group('Group 4: serializeAppState recoge settings UI', () => {
  localStorage.clear();
  localStorage.setItem('wf.ui.bandaSubtab', 'shopping');
  localStorage.setItem('wf.ui.factionSidebarOpen', '1');
  localStorage.setItem('wf-tour-seen', '1');
  const s = serializeAppState();
  ok(s.settings['wf.ui.bandaSubtab'] === 'shopping', 'bandaSubtab preservado');
  ok(s.settings['wf.ui.factionSidebarOpen'] === '1', 'factionSidebarOpen');
  ok(s.settings['wf-tour-seen'] === '1', 'tour-seen');
});

group('Group 5: deserializeAppState restaura localStorage', () => {
  localStorage.clear();
  const state = {
    version: 1,
    exportedAt: new Date().toISOString(),
    warbands: [
      { id:'wb-x', name:'Restored A', models:[] },
      { id:'wb-y', name:'Restored B', models:[] },
    ],
    campaigns: [
      { id:'c-z', name:'Camp X' },
    ],
    settings: {
      'wf.ui.bandaSubtab': 'variantes',
      'wf-tour-seen': '1',
    },
  };
  const r = deserializeAppState(state);
  ok(r && r.ok === true, 'devuelve ok:true');
  const wbA = JSON.parse(localStorage.getItem('warband-forge-v1:wb-x'));
  ok(wbA && wbA.name === 'Restored A', 'banda A restaurada');
  const camp = JSON.parse(localStorage.getItem('warband-forge-v1:cmp:c-z'));
  ok(camp && camp.name === 'Camp X', 'campaña restaurada');
  ok(localStorage.getItem('wf.ui.bandaSubtab') === 'variantes', 'setting bandaSubtab restaurado');
});

group('Group 6: deserializeAppState rechaza JSON inválido', () => {
  ok(deserializeAppState(null).ok === false, 'null → ok:false');
  ok(deserializeAppState({}).ok === false, 'sin warbands → ok:false');
  ok(deserializeAppState({ warbands: 'no-array' }).ok === false, 'warbands no-array → ok:false');
});

group('Group 7: round-trip serialize→deserialize preserva datos', () => {
  localStorage.clear();
  localStorage.setItem('warband-forge-v1:wb1', JSON.stringify({ id:'wb1', name:'Round', models:[{uid:'m1'}] }));
  localStorage.setItem('wf.ui.bandaSubtab', 'roster');
  const s1 = serializeAppState();
  localStorage.clear();  // wipe.
  deserializeAppState(s1);
  const wb = JSON.parse(localStorage.getItem('warband-forge-v1:wb1'));
  ok(wb && wb.name === 'Round', 'banda preservada en round-trip');
  ok(wb.models[0].uid === 'm1', 'detalles internos preservados');
  ok(localStorage.getItem('wf.ui.bandaSubtab') === 'roster', 'setting preservado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
