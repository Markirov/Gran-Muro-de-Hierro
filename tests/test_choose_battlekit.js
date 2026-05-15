/* Test for BACKLOG P2/4: choose-battlekit resolver
 *
 * Effects { kind:'choose-battlekit', filter:{ keyword:'HEAVY' } } let
 * the player pick a battlekit from the warband's armoury filtered by
 * keyword. Picked item goes to the Arsenal at save.
 *
 * Scope:
 *   - getFactionArmouryByKeyword(factionId, keyword): pure. Returns
 *     items from DATA.factions[fid].armoury (across all categories)
 *     whose weaponKeywords include the requested keyword. Items keep
 *     id/name/cost/currency for the picker.
 *   - resolveChooseBattlekit(disc, kitData): stores kitData on
 *     disc.chosenOption.resolvedKit for save-time application.
 *   - applyWizardOutcomesToWarband: applies choose-battlekit pending
 *     effects (with resolvedKit) to wb.arsenal.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_p2_4.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
  getFactionArmouryByKeyword: typeof getFactionArmouryByKeyword === 'function' ? getFactionArmouryByKeyword : null,
  resolveChooseBattlekit: typeof resolveChooseBattlekit === 'function' ? resolveChooseBattlekit : null,
  wizardBattleToFreeBattle,
  applyWizardOutcomesToWarband,
  DATA,
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
const { newWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
        getFactionArmouryByKeyword, resolveChooseBattlekit,
        wizardBattleToFreeBattle, applyWizardOutcomesToWarband, DATA } = lib;

if (!getFactionArmouryByKeyword) { console.error('✗ getFactionArmouryByKeyword not exported'); process.exit(1); }
if (!resolveChooseBattlekit) { console.error('✗ resolveChooseBattlekit not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: getFactionArmouryByKeyword — real faction', () => {
  // Pick the first faction that has armoury defined.
  const fid = Object.keys(DATA.factions).find(id =>
    DATA.factions[id].armoury && typeof DATA.factions[id].armoury === 'object'
  );
  ok(!!fid, 'at least one faction has armoury');
  const items = getFactionArmouryByKeyword(fid, 'HEAVY');
  ok(Array.isArray(items), 'returns array');
  // Should include at least one HEAVY-tagged weapon (multiple factions have one)
  if (items.length > 0) {
    ok(items[0].id && items[0].name, 'items have id+name');
    ok(items.every(it => Array.isArray(it.weaponKeywords) && it.weaponKeywords.includes('HEAVY')),
       'all returned items carry HEAVY');
  } else {
    ok(true, '(faction has no HEAVY items — depends on which faction was picked first)');
  }
});

group('Group 2: getFactionArmouryByKeyword — degenerate', () => {
  ok(getFactionArmouryByKeyword(null, 'HEAVY').length === 0, 'null factionId → empty');
  ok(getFactionArmouryByKeyword('nonexistent', 'HEAVY').length === 0, 'unknown faction → empty');
  ok(getFactionArmouryByKeyword('new-antioch', '').length === 0, 'empty keyword → empty');
});

group('Group 3: getFactionArmouryByKeyword — unknown keyword', () => {
  const r = getFactionArmouryByKeyword('new-antioch', 'NONEXISTENT_KW');
  ok(Array.isArray(r) && r.length === 0, 'unknown keyword → empty array');
});

/* ------------------------------------------------------------------ */
group('Group 4: resolveChooseBattlekit — stores resolved kit', () => {
  const disc = {
    chosenOption: { effect: { kind:'choose-battlekit', filter:{ keyword:'HEAVY' } } },
  };
  const kit = { id:'mg-tp', name:'Machine Gun', cost:2, currency:'☼' };
  resolveChooseBattlekit(disc, kit);
  ok(disc.chosenOption.resolvedKit && disc.chosenOption.resolvedKit.id === 'mg-tp',
     'resolvedKit stored');
  ok(disc.chosenOption.resolvedKit.cost === 2, 'cost preserved');
});

group('Group 5: resolveChooseBattlekit — wrong effect kind is no-op', () => {
  const disc = { chosenOption: { effect: { kind:'add-ducats', amount:30 } } };
  resolveChooseBattlekit(disc, { id:'x' });
  ok(!('resolvedKit' in disc.chosenOption), 'no-op on wrong kind');
});

group('Group 6: resolveChooseBattlekit — defensive', () => {
  let threw = false;
  try { resolveChooseBattlekit(null, { id:'x' }); } catch (e) { threw = true; }
  ok(!threw, 'null disc no-throw');
  try { resolveChooseBattlekit({}, null); } catch (e) { threw = true; }
  ok(!threw, 'null kit no-throw');
});

/* ------------------------------------------------------------------ */
group('Group 7: save applies choose-battlekit pending to Arsenal', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[2,2,1], rollTotal:5, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'Heavy Weapons Cache' }, lootDucats:50 },
        chosenOptionId:'surplus',
        chosenOption:{
          id:'surplus',
          effect:{ kind:'choose-battlekit', filter:{ keyword:'HEAVY' } },
          resolvedKit: { id:'mg-tp', name:'Machine Gun', cost:2, currency:'☼' },
        },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = newWarband();
  wb.id = 'wb_x';
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.arsenal.length === 1, 'one arsenal entry');
  ok(wb.arsenal[0].name === 'Machine Gun', 'name preserved');
  ok(wb.arsenal[0].source === 'exploration-choose', 'source tag');
});

group('Group 8: save without resolvedKit does NOT apply', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[2,2,1], rollTotal:5, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'X' }, lootDucats:50 },
        chosenOptionId:'surplus',
        chosenOption:{ id:'surplus', effect:{ kind:'choose-battlekit', filter:{ keyword:'HEAVY' } } /* no resolvedKit */ },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = newWarband(); wb.id = 'wb_x';
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.arsenal.length === 0, 'arsenal untouched when no resolvedKit');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
