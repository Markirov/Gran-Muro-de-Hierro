/* Test for Fase 6.5: Post-battle toast
 *
 * Lightweight, non-blocking notification. Hooked into save paths
 * (free + campaign) to surface "ganaste X 👑 · Y items pendientes en
 * la lista" right after the battle is persisted.
 *
 * Scope:
 *   - showToast(message, opts?): inserts a toast element into the DOM
 *     and schedules its removal. Idempotent — multiple calls stack.
 *     Returns the element for inspection.
 *   - postBattleToastSummary(wb, ducatsEarned): pure summary string
 *     builder. Combines earnings line with the count of pending
 *     shopping list entries on the warband.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase6_5.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband,
  addToShoppingList,
  postBattleToastSummary: typeof postBattleToastSummary === 'function' ? postBattleToastSummary : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(fn,ms){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { newWarband, addToShoppingList, postBattleToastSummary } = lib;

if (!postBattleToastSummary) { console.error('✗ postBattleToastSummary not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: postBattleToastSummary — earnings only, empty list', () => {
  const wb = newWarband();
  const s = postBattleToastSummary(wb, 50);
  ok(typeof s === 'string' && s.includes('50'), 'mentions 50 ducats earned');
  ok(s.includes('👑') || /ducados|ducats/i.test(s), 'includes ducats indicator');
});

group('Group 2: postBattleToastSummary — with pending shopping items', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'b' });
  const s = postBattleToastSummary(wb, 100);
  ok(s.includes('100'), 'earnings shown');
  ok(/2/.test(s), 'pending count (2) shown');
  ok(/lista|pendient/i.test(s), 'mentions shopping/pending');
});

group('Group 3: postBattleToastSummary — zero earnings', () => {
  const wb = newWarband();
  const s = postBattleToastSummary(wb, 0);
  ok(typeof s === 'string' && s.length > 0, 'still returns a string for 0 earnings');
});

group('Group 4: postBattleToastSummary — defensive', () => {
  ok(typeof postBattleToastSummary(null, 50) === 'string', 'null wb still returns string');
  ok(typeof postBattleToastSummary({}, 50) === 'string', 'empty wb still returns string');
});

/* ------------------------------------------------------------------ */
group('Group 5: DOM markup contains toast container', () => {
  ok(html.includes('id="toast-container"') || html.includes('class="toast'),
     'toast styles or container present in HTML');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
