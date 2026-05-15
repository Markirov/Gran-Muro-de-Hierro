/* Test for Fase 5.6: Arsenal model + add-named-battlekit auto-apply
 *
 * The exploration tables include effects like:
 *   { kind:'add-named-battlekit', name:'Field Shrine', currency:'👑', cost:0 }
 * Canon says these add a named battlekit to the warband's Arsenal.
 * Forge didn't have an Arsenal data structure — equipment lived per
 * model via model.battlekit. This subfase introduces wb.arsenal as
 * the canonical "shared equipment pool" and auto-applies the named
 * additions at save time.
 *
 * Scope:
 *   - newWarband.arsenal = []
 *   - migrateWarband backfills wb.arsenal
 *   - addToArsenal(wb, item): pushes a normalised entry, dedup by name
 *   - removeFromArsenal(wb, idx)
 *   - applyWizardOutcomesToWarband applies add-named-battlekit pending
 *     effects to the arsenal.
 *
 * Out of scope: choose-battlekit (still pending), arsenal display UI.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_6.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, migrateWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
  addToArsenal: typeof addToArsenal === 'function' ? addToArsenal : null,
  removeFromArsenal: typeof removeFromArsenal === 'function' ? removeFromArsenal : null,
  wizardBattleToFreeBattle,
  applyWizardOutcomesToWarband,
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
const { newWarband, migrateWarband, addToArsenal, removeFromArsenal,
        startLiveFreeBattle, SCENARIOS_CATALOG,
        wizardBattleToFreeBattle, applyWizardOutcomesToWarband } = lib;

if (!addToArsenal) { console.error('✗ addToArsenal not exported'); process.exit(1); }
if (!removeFromArsenal) { console.error('✗ removeFromArsenal not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: newWarband initializes arsenal', () => {
  const wb = newWarband();
  ok(Array.isArray(wb.arsenal), 'arsenal is an array');
  ok(wb.arsenal.length === 0, 'starts empty');
});

group('Group 2: migrateWarband backfills arsenal', () => {
  const legacy = { id:'wb_old', name:'Old', factionId:'new-antioch', models:[] };
  migrateWarband(legacy);
  ok(Array.isArray(legacy.arsenal), 'arsenal created');
  ok(legacy.arsenal.length === 0, 'empty after backfill');
  legacy.arsenal.push({ name:'X', currency:'👑', cost:0, addedAt:'2026-01-01', source:'manual' });
  migrateWarband(legacy);
  ok(legacy.arsenal.length === 1, 'idempotent: existing entries preserved');
});

/* ------------------------------------------------------------------ */
group('Group 3: addToArsenal — basic + normalisation', () => {
  const wb = newWarband();
  addToArsenal(wb, { name:'Field Shrine', currency:'👑', cost:0, source:'exploration' });
  ok(wb.arsenal.length === 1, 'added one');
  const e = wb.arsenal[0];
  ok(e.name === 'Field Shrine', 'name preserved');
  ok(e.currency === '👑', 'currency preserved');
  ok(e.cost === 0, 'cost preserved');
  ok(typeof e.addedAt === 'string' && e.addedAt.length > 10, 'addedAt auto-set');
  ok(e.source === 'exploration', 'source preserved');
});

group('Group 4: addToArsenal — dedupe by name', () => {
  const wb = newWarband();
  addToArsenal(wb, { name:'Troop Flag', currency:'☼', cost:1 });
  addToArsenal(wb, { name:'Troop Flag', currency:'☼', cost:1 });
  ok(wb.arsenal.length === 1, 'duplicate name not added');
});

group('Group 5: addToArsenal — defensive', () => {
  let threw = false;
  try { addToArsenal(null, { name:'X' }); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');

  const wb = newWarband();
  threw = false;
  try { addToArsenal(wb, null); } catch (e) { threw = true; }
  ok(!threw, 'null item does not throw');
  ok(wb.arsenal.length === 0, 'null item not added');

  threw = false;
  try { addToArsenal(wb, {}); } catch (e) { threw = true; }
  ok(!threw, 'empty item does not throw');
  ok(wb.arsenal.length === 0, 'item without name not added');
});

/* ------------------------------------------------------------------ */
group('Group 6: removeFromArsenal — splice', () => {
  const wb = newWarband();
  addToArsenal(wb, { name:'A', currency:'👑', cost:0 });
  addToArsenal(wb, { name:'B', currency:'👑', cost:0 });
  removeFromArsenal(wb, 0);
  ok(wb.arsenal.length === 1, 'removed one');
  ok(wb.arsenal[0].name === 'B', 'second entry preserved');
});

group('Group 7: removeFromArsenal — defensive', () => {
  const wb = newWarband();
  let threw = false;
  try { removeFromArsenal(null, 0); } catch (e) { threw = true; }
  ok(!threw, 'null wb does not throw');
  try { removeFromArsenal(wb, 5); } catch (e) { threw = true; }
  ok(!threw, 'out-of-range does not throw');
});

/* ------------------------------------------------------------------ */
group('Group 8: applyWizardOutcomesToWarband applies add-named-battlekit', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,3], rollTotal:9, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'Trench Shrine' }, lootDucats:90 },
        chosenOptionId:'standard',
        chosenOption:{
          id:'standard',
          effect:{ kind:'add-named-battlekit', name:'Troop Flag', currency:'☼', cost:1 },
        },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = newWarband();
  wb.id = 'wb_x';
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.arsenal.length === 1, 'one arsenal entry added');
  ok(wb.arsenal[0].name === 'Troop Flag', 'correct name');
  ok(wb.arsenal[0].currency === '☼', 'currency preserved');
  ok(wb.arsenal[0].source === 'exploration', 'source = exploration');
});

group('Group 9: applyWizardOutcomesToWarband — no pendingEffect = no arsenal add', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,3], rollTotal:9, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'X' }, lootDucats:90 },
        chosenOptionId:'sell',
        chosenOption:{ id:'sell', effect:{ kind:'add-ducats', amount:30 } },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = newWarband();
  wb.id = 'wb_x';
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.arsenal.length === 0, 'arsenal untouched when effect is not add-named-battlekit');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
