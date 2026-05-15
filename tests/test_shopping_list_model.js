/* Test for Fase 6.1: Shopping list — model + helpers
 *
 * Marcos asked for this explicitly. CLAUDE.md spec:
 *   wb.shoppingList: [{ modelUid, kitId, priority, addedAt }, ...]
 *
 * 6.1 is the plumbing pass: persist the field, migrate legacy bands,
 * and add the pure helpers that the UI (6.2-6.5) will hang off of.
 *
 * Scope:
 *   - newWarband() initializes wb.shoppingList = [].
 *   - migrateWarband(wb) backfills shoppingList = [] on older saves.
 *   - addToShoppingList(wb, item): pushes a normalized entry with
 *     auto addedAt (ISO) and auto priority (length + 1). Deduplicates
 *     on (modelUid, kitId) — adding the same combo twice is a no-op.
 *   - removeFromShoppingList(wb, idx): splices by index. Defensive.
 *     Re-numbers priority of remaining items to stay 1..N.
 *   - reorderShoppingList(wb, fromIdx, toIdx): moves entry within list,
 *     re-numbers priorities. Defensive on out-of-range indices.
 *   - findShoppingListEntry(wb, modelUid, kitId): returns the entry
 *     or null.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase6_1.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband,
  migrateWarband,
  addToShoppingList: typeof addToShoppingList === 'function' ? addToShoppingList : null,
  removeFromShoppingList: typeof removeFromShoppingList === 'function' ? removeFromShoppingList : null,
  reorderShoppingList: typeof reorderShoppingList === 'function' ? reorderShoppingList : null,
  findShoppingListEntry: typeof findShoppingListEntry === 'function' ? findShoppingListEntry : null,
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
const { newWarband, migrateWarband, addToShoppingList,
        removeFromShoppingList, reorderShoppingList, findShoppingListEntry } = lib;

if (!addToShoppingList) { console.error('✗ addToShoppingList not exported'); process.exit(1); }
if (!removeFromShoppingList) { console.error('✗ removeFromShoppingList not exported'); process.exit(1); }
if (!reorderShoppingList) { console.error('✗ reorderShoppingList not exported'); process.exit(1); }
if (!findShoppingListEntry) { console.error('✗ findShoppingListEntry not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: newWarband initializes shoppingList', () => {
  const wb = newWarband();
  ok(Array.isArray(wb.shoppingList), 'newWarband.shoppingList is an array');
  ok(wb.shoppingList.length === 0, 'starts empty');
});

group('Group 2: migrateWarband backfills shoppingList', () => {
  const legacy = { id:'wb_old', name:'Old Band', factionId:'new-antioch', models:[] };
  migrateWarband(legacy);
  ok(Array.isArray(legacy.shoppingList), 'shoppingList created');
  ok(legacy.shoppingList.length === 0, 'empty after backfill');
  // Idempotent: existing list preserved
  legacy.shoppingList.push({ modelUid:'m1', kitId:'k1', priority:1, addedAt:'2026-01-01' });
  migrateWarband(legacy);
  ok(legacy.shoppingList.length === 1, 'migrate does not clobber existing list');
});

/* ------------------------------------------------------------------ */
group('Group 3: addToShoppingList — auto fields', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'rifle' });
  ok(wb.shoppingList.length === 1, 'added one');
  const e = wb.shoppingList[0];
  ok(e.modelUid === 'm1' && e.kitId === 'rifle', 'fields preserved');
  ok(e.priority === 1, 'first entry priority = 1');
  ok(typeof e.addedAt === 'string' && e.addedAt.length > 10, 'addedAt is ISO string');
});

group('Group 4: addToShoppingList — priority auto-increments', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'b' });
  addToShoppingList(wb, { modelUid:'m2', kitId:'c' });
  ok(wb.shoppingList[0].priority === 1, '#1 priority 1');
  ok(wb.shoppingList[1].priority === 2, '#2 priority 2');
  ok(wb.shoppingList[2].priority === 3, '#3 priority 3');
});

group('Group 5: addToShoppingList — dedupe on (modelUid, kitId)', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'rifle' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'rifle' });
  ok(wb.shoppingList.length === 1, 'duplicate combo not added');
  // Different model with same kit: separate entry
  addToShoppingList(wb, { modelUid:'m2', kitId:'rifle' });
  ok(wb.shoppingList.length === 2, 'different model + same kit = new entry');
});

group('Group 6: addToShoppingList — defensive', () => {
  let threw = false;
  try { addToShoppingList(null, { modelUid:'m1', kitId:'k1' }); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');

  const wb = newWarband();
  threw = false;
  try { addToShoppingList(wb, null); } catch (e) { threw = true; }
  ok(!threw, 'null item does not throw');
  ok(wb.shoppingList.length === 0, 'null item not added');

  threw = false;
  try { addToShoppingList(wb, { kitId:'k1' }); } catch (e) { threw = true; }
  ok(!threw, 'missing modelUid does not throw');
  ok(wb.shoppingList.length === 0, 'missing modelUid not added');
});

/* ------------------------------------------------------------------ */
group('Group 7: removeFromShoppingList — splice + renumber', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'b' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'c' });
  removeFromShoppingList(wb, 1);
  ok(wb.shoppingList.length === 2, 'removed one');
  ok(wb.shoppingList[0].kitId === 'a' && wb.shoppingList[1].kitId === 'c',
     'remaining order preserved');
  ok(wb.shoppingList[0].priority === 1 && wb.shoppingList[1].priority === 2,
     'priorities renumbered 1..N');
});

group('Group 8: removeFromShoppingList — defensive', () => {
  const wb = newWarband();
  let threw = false;
  try { removeFromShoppingList(null, 0); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');

  threw = false;
  try { removeFromShoppingList(wb, -1); } catch (e) { threw = true; }
  ok(!threw, 'negative idx does not throw');
  ok(wb.shoppingList.length === 0, 'no-op');

  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  threw = false;
  try { removeFromShoppingList(wb, 99); } catch (e) { threw = true; }
  ok(!threw, 'out-of-range idx does not throw');
  ok(wb.shoppingList.length === 1, 'list intact');
});

/* ------------------------------------------------------------------ */
group('Group 9: reorderShoppingList — moves + renumbers', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'b' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'c' });
  // Move c (idx 2) to position 0
  reorderShoppingList(wb, 2, 0);
  ok(wb.shoppingList.map(e => e.kitId).join(',') === 'c,a,b', 'order c,a,b');
  ok(wb.shoppingList[0].priority === 1 && wb.shoppingList[1].priority === 2 && wb.shoppingList[2].priority === 3,
     'priorities renumbered after reorder');
});

group('Group 10: reorderShoppingList — defensive', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m1', kitId:'b' });
  let threw = false;
  try { reorderShoppingList(wb, 5, 0); } catch (e) { threw = true; }
  ok(!threw, 'out-of-range from-idx does not throw');
  try { reorderShoppingList(wb, 0, 5); } catch (e) { threw = true; }
  ok(!threw, 'out-of-range to-idx does not throw');
  ok(wb.shoppingList.length === 2, 'list intact after bad reorders');

  // Reorder to same position: no-op
  reorderShoppingList(wb, 0, 0);
  ok(wb.shoppingList[0].kitId === 'a', 'same-position reorder is a no-op');
});

/* ------------------------------------------------------------------ */
group('Group 11: findShoppingListEntry — lookup', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m1', kitId:'a' });
  addToShoppingList(wb, { modelUid:'m2', kitId:'a' });
  const e = findShoppingListEntry(wb, 'm1', 'a');
  ok(e && e.modelUid === 'm1' && e.kitId === 'a', 'found correct entry');
  ok(findShoppingListEntry(wb, 'unknown', 'a') === null, 'unknown model → null');
  ok(findShoppingListEntry(wb, 'm1', 'unknown') === null, 'unknown kit → null');
  ok(findShoppingListEntry(null, 'm1', 'a') === null, 'null wb → null');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
