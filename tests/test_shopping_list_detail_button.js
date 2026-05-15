/* Test for Fase 6.2: Detail panel "+ Lista de la compra" button
 *
 * The model detail panel renders the unit's available upgrades. This
 * subfase adds a per-upgrade button "+ Lista de la compra" / "✓ En
 * lista" that toggles wb.shoppingList membership for (modelUid, kitId).
 *
 * Scope:
 *   - isInShoppingList(wb, modelUid, kitId): pure boolean lookup.
 *   - toggleShoppingListEntry(wb, modelUid, kitId): add when absent,
 *     remove when present. Idempotent in the sense that it always
 *     leaves the list in a clean state.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase6_2.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband,
  isInShoppingList: typeof isInShoppingList === 'function' ? isInShoppingList : null,
  toggleShoppingListEntry: typeof toggleShoppingListEntry === 'function' ? toggleShoppingListEntry : null,
  addToShoppingList,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { newWarband, isInShoppingList, toggleShoppingListEntry, addToShoppingList } = lib;

if (!isInShoppingList) { console.error('✗ isInShoppingList not exported'); process.exit(1); }
if (!toggleShoppingListEntry) { console.error('✗ toggleShoppingListEntry not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: isInShoppingList', () => {
  const wb = newWarband();
  ok(isInShoppingList(wb, 'm1', 'rifle') === false, 'empty list → false');
  addToShoppingList(wb, { modelUid:'m1', kitId:'rifle' });
  ok(isInShoppingList(wb, 'm1', 'rifle') === true, 'added entry → true');
  ok(isInShoppingList(wb, 'm1', 'pistol') === false, 'different kit → false');
  ok(isInShoppingList(wb, 'm2', 'rifle') === false, 'different model → false');
  ok(isInShoppingList(null, 'm1', 'rifle') === false, 'null wb → false');
});

group('Group 2: toggleShoppingListEntry — adds when absent', () => {
  const wb = newWarband();
  toggleShoppingListEntry(wb, 'm1', 'rifle');
  ok(wb.shoppingList.length === 1, 'added one entry');
  ok(isInShoppingList(wb, 'm1', 'rifle') === true, 'entry present');
});

group('Group 3: toggleShoppingListEntry — removes when present', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'rifle' });
  toggleShoppingListEntry(wb, 'm1', 'rifle');
  ok(wb.shoppingList.length === 0, 'removed entry');
  ok(isInShoppingList(wb, 'm1', 'rifle') === false, 'lookup confirms removal');
});

group('Group 4: toggleShoppingListEntry — round-trip preserves length', () => {
  const wb = newWarband();
  toggleShoppingListEntry(wb, 'm1', 'rifle');
  toggleShoppingListEntry(wb, 'm1', 'rifle');
  ok(wb.shoppingList.length === 0, 'add+remove → empty');
});

group('Group 5: toggleShoppingListEntry — defensive', () => {
  let threw = false;
  try { toggleShoppingListEntry(null, 'm1', 'k1'); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');

  const wb = newWarband();
  threw = false;
  try { toggleShoppingListEntry(wb, null, 'k1'); } catch (e) { threw = true; }
  ok(!threw, 'null modelUid does not throw');
  ok(wb.shoppingList.length === 0, 'invalid modelUid not added');
});

/* ------------------------------------------------------------------ */
group('Group 6: HTML markup contains shopping list button attribute', () => {
  ok(html.includes('data-shopping-toggle'), 'detail-panel uses data-shopping-toggle attribute');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
