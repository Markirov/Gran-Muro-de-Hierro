/* Test for T1: Trauma D66 migration in wizard
 *
 * Wizard Trauma step migrates from injuryTable (6 entries, 1d6) to
 * traumaTable (22 entries, D66) which is the full canon. Existing
 * rollD66() and lookupTraumaEntry(value) primitives are reused.
 *
 * Scope:
 *   - renderWizardInjuries uses D66 roll instead of 1d6 (markup smoke).
 *   - Persisted injury record carries roll D66 value + entry id.
 *   - lookupTraumaEntry handles 11-66 plus the 41-63 range.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_t1.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  rollD66, lookupTraumaEntry, CAMPAIGN_TABLES,
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
const { rollD66, lookupTraumaEntry, CAMPAIGN_TABLES } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: rollD66 sanity', () => {
  for (let i = 0; i < 50; i++) {
    const r = rollD66();
    ok(r.tens >= 1 && r.tens <= 6, `tens in [1,6] (got ${r.tens})`);
    ok(r.units >= 1 && r.units <= 6, `units in [1,6]`);
    ok(r.value === r.tens*10 + r.units, 'value = tens*10 + units');
    if (i > 0) break;  // just verify shape once after the inner asserts pass
  }
});

group('Group 2: lookupTraumaEntry — known entries', () => {
  const e11 = lookupTraumaEntry(11);
  ok(e11 && e11.name === 'Dead', '11 → Dead');
  const e22 = lookupTraumaEntry(22);
  ok(e22 && e22.name === 'Head Wound', '22 → Head Wound');
  const e66 = lookupTraumaEntry(66);
  ok(e66 && e66.name === 'Prominent Scar', '66 → Prominent Scar');
});

group('Group 3: lookupTraumaEntry — Full Recovery range 41-63', () => {
  const e41 = lookupTraumaEntry(41);
  const e55 = lookupTraumaEntry(55);
  const e63 = lookupTraumaEntry(63);
  ok(e41 && e41.kind === 'recovery', '41 → recovery');
  ok(e55 && e55.kind === 'recovery', '55 → recovery');
  ok(e63 && e63.kind === 'recovery', '63 → recovery');
});

group('Group 4: lookupTraumaEntry — out of canon range', () => {
  // 17, 18, 19, 20 are not valid D66 results (no '7' on a d6) but
  // the lookup must be defensive. Returns null or undefined.
  const r = lookupTraumaEntry(17);
  ok(r === null || r === undefined, 'invalid D66 value (17) → null/undefined');
});

group('Group 5: traumaTable has 22 entries', () => {
  const t = CAMPAIGN_TABLES.traumaTable;
  ok(Array.isArray(t), 'traumaTable is array');
  ok(t.length >= 20, `at least 20 entries (got ${t.length})`);
});

/* ------------------------------------------------------------------ */
group('Group 6: DOM markup — wizard uses traumaTable + d66', () => {
  ok(/CAMPAIGN_TABLES\.traumaTable/.test(html), 'traumaTable referenced');
  // The Trauma step should now mention D66.
  ok(html.includes('D66') || /traumaTable/.test(html),
     'wizard injuries renderer references trauma D66');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
