/* Test for Fase 7.1 (CLAUDE.md P3/9): warband battle history helper
 *
 * Combines wb.freeBattles with battles from every campaign the
 * warband participates in. Returns a chronologically ordered list
 * with origin info for badge rendering.
 *
 * Scope:
 *   - getWarbandBattleHistory(wb, opts): pure. Returns an array of
 *     { kind:'free'|'campaign', date, battle, campaign? } sorted
 *     ascending by date. opts.campaigns lets tests inject the
 *     campaign list without touching localStorage.
 *
 * Out of scope for 7.1: the UI panel that consumes the helper.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase7_1.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, createFreeBattle, addFreeBattle,
  getWarbandBattleHistory: typeof getWarbandBattleHistory === 'function' ? getWarbandBattleHistory : null,
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
const { newWarband, createFreeBattle, addFreeBattle, getWarbandBattleHistory } = lib;

if (!getWarbandBattleHistory) {
  console.error('✗ getWarbandBattleHistory not exported');
  process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: empty warband → empty history', () => {
  const wb = newWarband();
  const h = getWarbandBattleHistory(wb, { campaigns: [] });
  ok(Array.isArray(h) && h.length === 0, 'empty array');
});

group('Group 2: free battles only', () => {
  const wb = newWarband();
  const fb1 = createFreeBattle({ scenarioId:'a' });
  fb1.completedAt = '2026-01-05T10:00:00Z';
  const fb2 = createFreeBattle({ scenarioId:'b' });
  fb2.completedAt = '2026-02-10T10:00:00Z';
  addFreeBattle(wb, fb1);
  addFreeBattle(wb, fb2);
  const h = getWarbandBattleHistory(wb, { campaigns: [] });
  ok(h.length === 2, 'two entries');
  ok(h.every(e => e.kind === 'free'), 'all marked free');
  ok(h[0].date <= h[1].date, 'sorted ascending by date');
});

group('Group 3: campaign battles where warband participates', () => {
  const wb = newWarband();
  const c1 = {
    id:'cmp_1', name:'Crucible',
    battles: [
      { id:'btl_a', date:'2026-03-01', scenario:'x',
        participants:[{ warbandId: wb.id, result:'win' }] },
      { id:'btl_b', date:'2026-03-05', scenario:'y',
        participants:[{ warbandId:'wb_other', result:'win' }] },  // NOT our wb
    ],
  };
  const c2 = {
    id:'cmp_2', name:'Hunger',
    battles: [
      { id:'btl_c', date:'2026-03-10', scenario:'z',
        participants:[{ warbandId: wb.id, result:'loss' }] },
    ],
  };
  const h = getWarbandBattleHistory(wb, { campaigns: [c1, c2] });
  ok(h.length === 2, 'two entries (skipping btl_b)');
  ok(h.every(e => e.kind === 'campaign'), 'all marked campaign');
  ok(h[0].campaign.name === 'Crucible', 'first ordered campaign Crucible');
  ok(h[1].campaign.name === 'Hunger', 'second Hunger');
});

group('Group 4: mixed timeline ordered chronologically', () => {
  const wb = newWarband();
  const fb = createFreeBattle({ scenarioId:'a' });
  fb.completedAt = '2026-03-07T10:00:00Z';  // between two campaign battles
  addFreeBattle(wb, fb);
  const c = {
    id:'cmp_x', name:'Mix',
    battles: [
      { id:'btl_a', date:'2026-03-01', scenario:'x', participants:[{ warbandId: wb.id, result:'win' }] },
      { id:'btl_c', date:'2026-03-15', scenario:'z', participants:[{ warbandId: wb.id, result:'loss' }] },
    ],
  };
  const h = getWarbandBattleHistory(wb, { campaigns: [c] });
  ok(h.length === 3, 'three entries (2 campaign + 1 free)');
  ok(h[0].kind === 'campaign' && h[1].kind === 'free' && h[2].kind === 'campaign',
     'chronological mix preserved');
});

group('Group 5: defensive — null inputs', () => {
  ok(getWarbandBattleHistory(null, { campaigns:[] }).length === 0, 'null wb → empty');
  ok(getWarbandBattleHistory(newWarband(), null).length === 0, 'null opts → empty');
});

group('Group 6: each entry exposes date string and battle reference', () => {
  const wb = newWarband();
  const fb = createFreeBattle({});
  fb.completedAt = '2026-04-01T10:00:00Z';
  addFreeBattle(wb, fb);
  const h = getWarbandBattleHistory(wb, { campaigns:[] });
  ok(typeof h[0].date === 'string' && h[0].date.length > 0, 'date present');
  ok(h[0].battle && h[0].battle.id === fb.id, 'battle reference preserved');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
