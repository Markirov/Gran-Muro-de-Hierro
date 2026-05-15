/* Test for P1/3: wb.strongbox for free-battle context
 *
 * Free battles accumulate fb.loot / fb.glory per battle but the
 * warband had no central balance. As a result the QM "Lista" tab was
 * campaign-only. This subfase adds wb.strongbox = { ducados, glory }
 * that addFreeBattle increments, lets buyShoppingItem operate in
 * free context, and ensures legacy bands get a zero baseline.
 *
 * Scope:
 *   - newWarband.strongbox = { ducados: 0, glory: 0 }
 *   - migrateWarband backfills { ducados: 0, glory: 0 } if absent
 *     (no retroactive sum — would conflict with future manual edits;
 *     there's a separate one-shot helper for retro-fill if needed).
 *   - addFreeBattle increments strongbox by fb.loot / fb.glory.
 *   - buyShoppingItem accepts c=null and routes to strongbox debit.
 *   - getWarbandBalance(wb, c?) helper for unified read.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_p1_3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, migrateWarband, addFreeBattle, createFreeBattle,
  getWarbandBalance: typeof getWarbandBalance === 'function' ? getWarbandBalance : null,
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
const { newWarband, migrateWarband, addFreeBattle, createFreeBattle, getWarbandBalance } = lib;

if (!getWarbandBalance) { console.error('✗ getWarbandBalance not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: newWarband initializes strongbox', () => {
  const wb = newWarband();
  ok(wb.strongbox && typeof wb.strongbox === 'object', 'strongbox object present');
  ok(wb.strongbox.ducados === 0, 'starts ducados=0');
  ok(wb.strongbox.glory === 0, 'starts glory=0');
});

group('Group 2: migrateWarband backfills strongbox', () => {
  const legacy = { id:'wb_old', name:'Old', factionId:'new-antioch', models:[] };
  migrateWarband(legacy);
  ok(legacy.strongbox, 'strongbox created');
  ok(legacy.strongbox.ducados === 0 && legacy.strongbox.glory === 0, 'zeroed baseline');
  // Idempotent: existing strongbox preserved
  legacy.strongbox.ducados = 50;
  migrateWarband(legacy);
  ok(legacy.strongbox.ducados === 50, 'existing strongbox not overwritten');
});

/* ------------------------------------------------------------------ */
group('Group 3: addFreeBattle increments strongbox', () => {
  const wb = newWarband();
  const fb1 = createFreeBattle({ scenarioId:'hold-the-line' });
  fb1.loot = 50;
  fb1.glory = 1;
  addFreeBattle(wb, fb1);
  ok(wb.strongbox.ducados === 50, 'ducados +50');
  ok(wb.strongbox.glory === 1, 'glory +1');

  const fb2 = createFreeBattle({ scenarioId:'hold-the-line' });
  fb2.loot = 30;
  fb2.glory = 0;
  addFreeBattle(wb, fb2);
  ok(wb.strongbox.ducados === 80, 'ducados +30 → 80');
  ok(wb.strongbox.glory === 1, 'glory unchanged');
});

group('Group 4: addFreeBattle — defensive against missing fields', () => {
  const wb = newWarband();
  const fb = createFreeBattle({});
  // fb.loot, fb.glory default to 0
  addFreeBattle(wb, fb);
  ok(wb.strongbox.ducados === 0, 'no loot → no change');
  ok(wb.strongbox.glory === 0, 'no glory → no change');
});

/* ------------------------------------------------------------------ */
group('Group 5: getWarbandBalance — free context (no campaign)', () => {
  const wb = newWarband();
  wb.strongbox = { ducados: 100, glory: 5 };
  const bal = getWarbandBalance(wb, null);
  ok(bal.ducados === 100, 'ducados from strongbox');
  ok(bal.glory === 5, 'glory from strongbox');
});

group('Group 6: getWarbandBalance — campaign context defers to campaign', () => {
  // When a campaign is provided we fall back to campaignBalance.
  // Without a real campaignBalance fixture this would call the real
  // function; we test only that the helper picks the right path.
  const wb = newWarband();
  wb.strongbox = { ducados: 999, glory: 99 };
  // Pass a minimal campaign-shape object that campaignBalance can
  // handle: empty battles/finances yields zeros.
  const c = { id:'cmp_t', warbandIds:['wb_x'], battles:[], finances:{},
    rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} };
  wb.id = 'wb_x';
  const bal = getWarbandBalance(wb, c);
  ok(bal && typeof bal.ducados === 'number', 'returns a balance shape');
  ok(bal.ducados !== 999, 'campaign branch does NOT use wb.strongbox');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
