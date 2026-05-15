/* Test for P2/7: retro-fill helper for wb.strongbox
 *
 * P1/3 added wb.strongbox with a baseline of {0,0} on migrate (no
 * retro-sum) to avoid double-count with manual edits. For bands that
 * accumulated freeBattles before P1/3 landed, the strongbox is now
 * understated. This one-shot helper recomputes strongbox from the
 * persisted freeBattles, useful as a manual "fix my balance" action.
 *
 * Scope:
 *   - rebuildStrongboxFromFreeBattles(wb): resets wb.strongbox to
 *     {0,0}, then sums fb.loot/fb.glory across wb.freeBattles.
 *     Mutates wb. Defensive against missing arrays.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_p2_7.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, createFreeBattle,
  rebuildStrongboxFromFreeBattles: typeof rebuildStrongboxFromFreeBattles === 'function' ? rebuildStrongboxFromFreeBattles : null,
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
const { newWarband, createFreeBattle, rebuildStrongboxFromFreeBattles } = lib;
if (!rebuildStrongboxFromFreeBattles) { console.error('✗ rebuildStrongboxFromFreeBattles not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: empty wb → zeros', () => {
  const wb = newWarband();
  rebuildStrongboxFromFreeBattles(wb);
  ok(wb.strongbox.ducados === 0, 'ducados=0');
  ok(wb.strongbox.glory === 0, 'glory=0');
});

group('Group 2: rebuild sums all freeBattles', () => {
  const wb = newWarband();
  const fb1 = createFreeBattle({}); fb1.loot = 50; fb1.glory = 1;
  const fb2 = createFreeBattle({}); fb2.loot = 30; fb2.glory = 0;
  wb.freeBattles.push(fb1, fb2);
  // Tamper with strongbox to test that rebuild overwrites
  wb.strongbox = { ducados: 999, glory: 99 };
  rebuildStrongboxFromFreeBattles(wb);
  ok(wb.strongbox.ducados === 80, 'ducados = 50 + 30 = 80');
  ok(wb.strongbox.glory === 1, 'glory = 1 + 0 = 1');
});

group('Group 3: defensive', () => {
  let threw = false;
  try { rebuildStrongboxFromFreeBattles(null); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');

  const wb = { id:'wb_x' };  // no freeBattles, no strongbox
  rebuildStrongboxFromFreeBattles(wb);
  ok(wb.strongbox && wb.strongbox.ducados === 0, 'strongbox created');
  ok(wb.strongbox.glory === 0, 'glory=0');
});

group('Group 4: missing loot/glory on a fb defaults to 0', () => {
  const wb = newWarband();
  const fb1 = createFreeBattle({});           // loot=0, glory=0 by default
  const fb2 = createFreeBattle({}); fb2.loot = 25;
  const fb3 = {};                              // raw obj sin loot/glory
  wb.freeBattles.push(fb1, fb2, fb3);
  rebuildStrongboxFromFreeBattles(wb);
  ok(wb.strongbox.ducados === 25, 'only fb2 contributes');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
