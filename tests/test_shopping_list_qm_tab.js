/* Test for Fase 6.3: Shopping list QM tab — rows builder
 *
 * The QM modal grows a "Lista" tab that shows the current shopping
 * list with per-entry affordability and a buy action. The buy itself
 * mutates campaign+warband state in ways that are awkward to unit-test
 * without a full QM context, so 6.3 focuses on the pure row-builder
 * helper that drives the render and is easy to verify in isolation.
 *
 * Scope:
 *   - qmShoppingRows(wb, balance): for each entry in wb.shoppingList,
 *     produces a row with the resolved model + kit definition + cost +
 *     currency + affordability flag. Rows for entries whose model or
 *     kit cannot be resolved still appear (so the user can clean up
 *     stale entries) but with affordable=false and a resolution flag.
 *   - DOM presence of qm-pane-shopping.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase6_3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband,
  addToShoppingList,
  qmShoppingRows: typeof qmShoppingRows === 'function' ? qmShoppingRows : null,
  DATA,
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
const { newWarband, addToShoppingList, qmShoppingRows, DATA } = lib;

if (!qmShoppingRows) { console.error('✗ qmShoppingRows not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

// Build a warband with a real unit + a real upgrade we know exists.
// Pick the first faction → first unit that has at least one upgrade.
function realFixtureWb() {
  for (const fid of Object.keys(DATA.factions)) {
    const f = DATA.factions[fid];
    for (const u of (f.units || [])) {
      if (Array.isArray(u.upgrades) && u.upgrades.length) {
        return {
          warband: Object.assign(newWarband(fid), {
            models: [{ uid:'m1', unitId: u.id, upgrades:[] }],
          }),
          factionId: fid,
          unit: u,
          upgrade: u.upgrades[0],
        };
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
group('Group 1: qmShoppingRows — empty list', () => {
  const wb = newWarband();
  const rows = qmShoppingRows(wb, { ducados: 100, glory: 5 });
  ok(Array.isArray(rows) && rows.length === 0, 'empty list → empty rows');
});

/* ------------------------------------------------------------------ */
group('Group 2: qmShoppingRows — resolves real upgrade', () => {
  const fx = realFixtureWb();
  if (!fx) { ok(false, 'no fixture available'); return; }
  const wb = fx.warband;
  addToShoppingList(wb, { modelUid:'m1', kitId: fx.upgrade.id });
  const rows = qmShoppingRows(wb, { ducados: 9999, glory: 99 });
  ok(rows.length === 1, 'one row produced');
  const r = rows[0];
  ok(r.entry && r.entry.kitId === fx.upgrade.id, 'entry preserved');
  ok(r.kit && r.kit.id === fx.upgrade.id, 'kit definition resolved');
  ok(typeof r.cost === 'number' && r.cost >= 0, 'cost extracted');
  ok(['👑','☼'].includes(r.currency), 'currency is 👑 or ☼');
  ok(r.affordable === true, 'affordable when balance is huge');
  ok(r.resolved === true, 'resolved=true when kit found');
});

/* ------------------------------------------------------------------ */
group('Group 3: qmShoppingRows — unaffordable when balance is low', () => {
  const fx = realFixtureWb();
  if (!fx) { ok(false, 'no fixture available'); return; }
  const wb = fx.warband;
  addToShoppingList(wb, { modelUid:'m1', kitId: fx.upgrade.id });
  const rows = qmShoppingRows(wb, { ducados: 0, glory: 0 });
  ok(rows[0].affordable === false || rows[0].cost === 0,
     'unaffordable with balance 0 (unless cost is 0)');
});

/* ------------------------------------------------------------------ */
group('Group 4: qmShoppingRows — unresolved entry still listed', () => {
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'m_missing', kitId:'k_missing' });
  const rows = qmShoppingRows(wb, { ducados: 1000, glory: 99 });
  ok(rows.length === 1, 'one row even when unresolved');
  ok(rows[0].resolved === false, 'resolved=false');
  ok(rows[0].affordable === false, 'unresolved cannot be afforded');
});

/* ------------------------------------------------------------------ */
group('Group 5: qmShoppingRows — defensive', () => {
  ok(qmShoppingRows(null, { ducados:0, glory:0 }).length === 0, 'null wb → empty');
  ok(qmShoppingRows({}, { ducados:0, glory:0 }).length === 0, 'empty wb → empty');

  // No balance object → behave as if balance=0
  const wb = newWarband();
  addToShoppingList(wb, { modelUid:'x', kitId:'y' });
  let threw = false;
  try { qmShoppingRows(wb, null); } catch (e) { threw = true; }
  ok(!threw, 'null balance does not throw');
});

/* ------------------------------------------------------------------ */
group('Group 6: DOM markup present', () => {
  ok(html.includes('id="qm-pane-shopping"'), 'qm-pane-shopping pane exists');
  ok(/data-qmtab="shopping"/.test(html), 'shopping tab button exists');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
