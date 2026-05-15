/* Test for 7.4: getWarbandCampaigns + UI button
 *
 * Cierra el polish menor de Fase 7. Helper que lista las campañas
 * donde una banda participa, para surfacearlo desde el panel banda.
 *
 * Scope:
 *   - getWarbandCampaigns(wb, opts): pure. Filtra opts.campaigns por
 *     wb.id ∈ c.warbandIds. Devuelve metadata mínima { id, name,
 *     battleCount, gameNumber }.
 *   - Tests on helper. UI button es DOM smoke check.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_7_4.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband,
  getWarbandCampaigns: typeof getWarbandCampaigns === 'function' ? getWarbandCampaigns : null,
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
const { newWarband, getWarbandCampaigns } = lib;
if (!getWarbandCampaigns) { console.error('✗ getWarbandCampaigns not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: empty / degenerate', () => {
  ok(Array.isArray(getWarbandCampaigns(null, { campaigns:[] })), 'null wb → array');
  ok(getWarbandCampaigns(null, { campaigns:[] }).length === 0, 'null wb → empty');
  ok(getWarbandCampaigns(newWarband(), null).length === 0, 'null opts → empty');
});

group('Group 2: filters by warbandIds', () => {
  const wb = newWarband();
  wb.id = 'wb_x';
  const c1 = { id:'cmp_1', name:'Crucible', warbandIds:['wb_x','wb_y'], battles:[], gameNumber:3 };
  const c2 = { id:'cmp_2', name:'Hunger',   warbandIds:['wb_z'],         battles:[], gameNumber:1 };
  const c3 = { id:'cmp_3', name:'Solo',     warbandIds:['wb_x'],         battles:[{id:'a'},{id:'b'}], gameNumber:5 };
  const r = getWarbandCampaigns(wb, { campaigns:[c1,c2,c3] });
  ok(r.length === 2, 'wb_x participates in 2 campaigns');
  ok(r.find(x => x.id === 'cmp_1'), 'Crucible included');
  ok(!r.find(x => x.id === 'cmp_2'), 'Hunger excluded');
  ok(r.find(x => x.id === 'cmp_3'), 'Solo included');
});

group('Group 3: metadata preserved', () => {
  const wb = newWarband(); wb.id = 'wb_x';
  const c = { id:'cmp_1', name:'Crucible', warbandIds:['wb_x'], gameNumber:7,
    battles:[{id:'a'},{id:'b'},{id:'c'}] };
  const r = getWarbandCampaigns(wb, { campaigns:[c] });
  ok(r[0].name === 'Crucible', 'name preserved');
  ok(r[0].battleCount === 3, 'battleCount derived');
  ok(r[0].gameNumber === 7, 'gameNumber preserved');
});

group('Group 4: DOM markup', () => {
  ok(html.includes('id="btn-warband-campaigns"'), 'panel banda has the campaigns button');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
