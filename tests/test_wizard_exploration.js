/* Test for Fase 4.5: Exploration step — context resolution + roll wrapper
 *
 * This subfase wires Fase 1's exploration engine into the wizard's
 * Exploration step. Scope:
 *   - getWizardExplorationContexts(w): per-participant context array
 *     { warbandId, dice, tableName, alreadyDiscovered }. Free context
 *     reads dice from WIZARD.lfb.dicePicked and uses Common table.
 *     Campaign context derives dice from determineExplorationDice
 *     against the campaign's game number for each warband.
 *   - rollWizardExploration(ctx, opts): rolls the dice and resolves
 *     against the picked table, returning { dice, rollTotal, result }.
 *
 * Out of scope for 4.5: animation, re-roll buttons, option-pick modal,
 * fork modal, application of effects to the warband. Those land in
 * CLAUDE.md Fase 5 (full Exploration Modal).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_5.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard, closeWizard, startLiveFreeBattle,
  getWizardExplorationContexts: typeof getWizardExplorationContexts === 'function' ? getWizardExplorationContexts : null,
  rollWizardExploration: typeof rollWizardExploration === 'function' ? rollWizardExploration : null,
  resolveExplorationRoll,
  determineExplorationDice,
  selectExplorationTable,
  SCENARIOS_CATALOG,
  STATE,
  getWizard: () => (typeof WIZARD !== 'undefined' ? WIZARD : null),
  setCampaign: (c) => { STATE.currentCampaign = c; },
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
const { startWizard, closeWizard, startLiveFreeBattle, getWizardExplorationContexts,
        rollWizardExploration, SCENARIOS_CATALOG, getWizard, setCampaign } = lib;

if (!getWizardExplorationContexts) { console.error('✗ getWizardExplorationContexts not exported'); process.exit(1); }
if (!rollWizardExploration) { console.error('✗ rollWizardExploration not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

/* ------------------------------------------------------------------ */
group('Group 1: getWizardExplorationContexts — free context', () => {
  setCampaign(null);
  const wb = { id:'wb_x', models:[], discoveredLocations:['common:6'], freeBattles:[] };
  const lfb = startLiveFreeBattle(wb, { scenarioId: FIRST_SCENARIO, dicePicked: 5 });
  const w = {
    context: 'free',
    lfb,
    battle: { participants:[{ warbandId:'wb_x', modelOutcomes:[] }] },
  };
  const ctxs = getWizardExplorationContexts(w, { getWarband: (id) => id === 'wb_x' ? wb : null });
  ok(Array.isArray(ctxs) && ctxs.length === 1, 'free context yields one ctx');
  ok(ctxs[0].warbandId === 'wb_x', 'warbandId from lfb');
  ok(ctxs[0].dice === 5, 'dice from lfb.dicePicked');
  ok(ctxs[0].tableName === 'common', 'free always uses common table');
  ok(Array.isArray(ctxs[0].alreadyDiscovered), 'alreadyDiscovered is an array');
  ok(ctxs[0].alreadyDiscovered.includes('common:6'), 'alreadyDiscovered from wb.discoveredLocations');
});

/* ------------------------------------------------------------------ */
group('Group 2: getWizardExplorationContexts — campaign context', () => {
  const camp = {
    id:'cmp_t', name:'T', warbandIds:['wb_a','wb_b'], gameNumber: 7,
    battles:[], warbandStates:{},
    rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}},
  };
  setCampaign(camp);
  const wbA = { id:'wb_a', models:[], discoveredLocations:[], factionId:'new-antioch' };
  const wbB = { id:'wb_b', models:[], discoveredLocations:['rare:11'], factionId:'heretic-legions' };
  const w = {
    context: 'campaign',
    battle: { participants:[
      { warbandId:'wb_a', modelOutcomes:[] },
      { warbandId:'wb_b', modelOutcomes:[] },
    ]},
  };
  const ctxs = getWizardExplorationContexts(w, { getWarband: (id) => id === 'wb_a' ? wbA : (id === 'wb_b' ? wbB : null) });
  ok(ctxs.length === 2, 'campaign with two participants yields two ctxs');
  ok(ctxs[0].warbandId === 'wb_a' && ctxs[1].warbandId === 'wb_b', 'ctxs preserve participant order');
  // game 7 → dice should be 5 per determineExplorationDice
  ok(ctxs[0].dice === 5, 'campaign game 7 → 5 dice');
  // game 7 → rare or common (preference common by default)
  ok(ctxs[0].tableName === 'rare' || ctxs[0].tableName === 'common',
     `table name is rare or common (got ${ctxs[0].tableName})`);
  ok(ctxs[1].alreadyDiscovered.includes('rare:11'), 'second wb keeps its own discoveredLocations');
});

/* ------------------------------------------------------------------ */
group('Group 3: getWizardExplorationContexts — degenerate inputs', () => {
  ok(getWizardExplorationContexts(null) instanceof Array, 'null wizard → array (empty)');
  ok(getWizardExplorationContexts(null).length === 0, 'null wizard → empty array');
  ok(getWizardExplorationContexts({}).length === 0, 'empty wizard → empty array');
});

/* ------------------------------------------------------------------ */
group('Group 4: rollWizardExploration — produces a structured result', () => {
  const ctx = { warbandId:'wb_x', dice: 3, tableName: 'common', alreadyDiscovered: [] };
  const res = rollWizardExploration(ctx);
  ok(typeof res === 'object' && res !== null, 'returns an object');
  ok(Array.isArray(res.dice) && res.dice.length === 3, 'rolled 3 dice');
  ok(res.dice.every(d => d >= 1 && d <= 6), 'all dice in 1-6 range');
  ok(typeof res.rollTotal === 'number' && res.rollTotal === res.dice.reduce((a,b)=>a+b,0),
     'rollTotal matches sum');
  ok(typeof res.result === 'object' && res.result !== null, 'result is an object');
  ok(['pillaged','discovery','fork'].includes(res.result.kind), 'result.kind is canon enum');
  ok(typeof res.result.lootDucats === 'number', 'result.lootDucats is a number');
});

/* ------------------------------------------------------------------ */
group('Group 5: rollWizardExploration — re-roll opts forwarded', () => {
  const ctx = { warbandId:'wb_x', dice: 2, tableName: 'common', alreadyDiscovered: [] };
  // Just check it doesn't crash and returns a sane shape when re-roll flags set.
  const res = rollWizardExploration(ctx, { won: true, useReroll: true, useWinReroll: true });
  ok(typeof res.rollTotal === 'number', 'rollTotal computed with re-roll opts');
  ok(typeof res.rerollUsed === 'boolean', 'rerollUsed flag present');
  ok(typeof res.rerollWinUsed === 'boolean', 'rerollWinUsed flag present');
});

/* ------------------------------------------------------------------ */
group('Group 6: rollWizardExploration — defensive against bad input', () => {
  // dice=0 is a degenerate case; should still produce something safe.
  const res = rollWizardExploration({ warbandId:'wb_x', dice: 0, tableName: 'common', alreadyDiscovered: [] });
  ok(res.dice.length === 0, 'dice=0 produces empty dice array');
  ok(res.rollTotal === 0, 'rollTotal=0');
  // result against rollTotal=0 hits no entry → pillaged
  ok(res.result.kind === 'pillaged', 'rollTotal=0 → pillaged (no table entry)');
});

/* ------------------------------------------------------------------ */
group('Group 7: WIZARD.battle has discoveries array initialized', () => {
  setCampaign({ id:'cmp_t', name:'T', warbandIds:['wb_x'], battles:[], warbandStates:{},
    rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} });
  startWizard();
  const w = getWizard();
  ok(Array.isArray(w.battle.discoveries), 'WIZARD.battle.discoveries is an array');
  closeWizard();
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
