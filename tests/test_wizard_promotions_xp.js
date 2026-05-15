/* Test for Fase 4.4: Promotions/XP step — helpers + free-context XP source
 *
 * The existing renderWizardAdvancements assumed campaign context (read
 * current XP from c.warbandStates). 4.4 extracts the pure XP math into
 * helpers and adds a free-context XP source that reads from each model's
 * baseProgression.xp directly on the warband.
 *
 * Out of scope for 4.4: cannotGainXp (Head Wound) — the existing logic
 * already omits it; fixing here is a separate canon-fidelity task and
 * shouldn't ride along with the structural pass.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_4.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard,
  closeWizard,
  startLiveFreeBattle,
  computeModelXPGain: typeof computeModelXPGain === 'function' ? computeModelXPGain : null,
  getCurrentModelXP: typeof getCurrentModelXP === 'function' ? getCurrentModelXP : null,
  wizardHasAdvancements: typeof wizardHasAdvancements === 'function' ? wizardHasAdvancements : null,
  advancementsEarned: typeof advancementsEarned === 'function' ? advancementsEarned : null,
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
const { computeModelXPGain, getCurrentModelXP, wizardHasAdvancements,
        advancementsEarned, startWizard, closeWizard, startLiveFreeBattle,
        SCENARIOS_CATALOG, getWizard, setCampaign } = lib;

if (!computeModelXPGain) { console.error('✗ computeModelXPGain not exported'); process.exit(1); }
if (!getCurrentModelXP) { console.error('✗ getCurrentModelXP not exported'); process.exit(1); }
if (!wizardHasAdvancements) { console.error('✗ wizardHasAdvancements not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

/* ------------------------------------------------------------------ */
group('Group 1: computeModelXPGain — survival baseline', () => {
  ok(computeModelXPGain({ participated:true, outOfAction:false }) === 1,
     'survived participation → +1 XP');
  ok(computeModelXPGain({ participated:true, outOfAction:true }) === 0,
     'OoA cancels survival bonus → 0 XP');
  ok(computeModelXPGain({ participated:false, outOfAction:false }) === 0,
     'did not participate → 0 XP');
});

group('Group 2: computeModelXPGain — kills + feats', () => {
  ok(computeModelXPGain({ participated:true, outOfAction:false, kills:3 }) === 4,
     '+1 survival + 3 kills = 4');
  ok(computeModelXPGain({ participated:true, outOfAction:false, kills:2, feats:1 }) === 4,
     '+1 + 2 kills + 1 feat = 4');
  ok(computeModelXPGain({ participated:true, outOfAction:true, kills:5, feats:2 }) === 7,
     'OoA: 0 survival + 5 kills + 2 feats = 7');
});

group('Group 3: computeModelXPGain — injury bitter-exp grants +1', () => {
  ok(computeModelXPGain({ participated:true, outOfAction:true, injury:{id:'bitter-exp'} }) === 1,
     'OoA with bitter-exp injury → +1');
  ok(computeModelXPGain({ participated:true, outOfAction:true, injury:{id:'old-wound'} }) === 0,
     'OoA with non-bitter injury → 0');
});

/* ------------------------------------------------------------------ */
group('Group 4: getCurrentModelXP — free context reads baseProgression', () => {
  const wb = {
    id:'wb_x',
    models: [
      { uid:'m1', baseProgression:{ xp: 12, advancements:[], scars:[] } },
      { uid:'m2', baseProgression:{ xp:  3 } },
      { uid:'m3' }, // no baseProgression
    ],
  };
  ok(getCurrentModelXP(wb, 'm1', { context:'free' }) === 12, 'reads m1 XP=12');
  ok(getCurrentModelXP(wb, 'm2', { context:'free' }) === 3,  'reads m2 XP=3');
  ok(getCurrentModelXP(wb, 'm3', { context:'free' }) === 0,  'missing baseProgression → 0');
  ok(getCurrentModelXP(wb, 'nope', { context:'free' }) === 0,'unknown model → 0');
});

group('Group 5: getCurrentModelXP — campaign reads warbandStates', () => {
  const wb = { id:'wb_x', models:[{ uid:'m1' }] };
  const ctx = {
    context: 'campaign',
    warbandStates: {
      wb_x: { modelStates: { m1: { xp: 9 } } },
    },
  };
  ok(getCurrentModelXP(wb, 'm1', ctx) === 9, 'campaign ctx reads warbandStates xp');
  ok(getCurrentModelXP(wb, 'unknown', ctx) === 0, 'unknown model in campaign → 0');

  // Missing warbandStates entry → 0
  const ctx2 = { context:'campaign', warbandStates: {} };
  ok(getCurrentModelXP(wb, 'm1', ctx2) === 0, 'campaign ctx without state → 0');
});

/* ------------------------------------------------------------------ */
group('Group 6: wizardHasAdvancements — threshold crossings', () => {
  // Canon thresholds are [2,4,7,10,13,16,19,22,25,28] — we don't hardcode
  // the exact values, just verify the boundary behaviour through the API.
  ok(advancementsEarned(0) === 0, 'baseline: XP 0 → 0 advancements earned');
  ok(advancementsEarned(2) >= 1, 'XP 2 reaches at least the first threshold');

  // Wizard with one participant whose model goes 1 → 2 XP this battle.
  // Crosses the first threshold, so wizardHasAdvancements must be true.
  const wb = { id:'wb_x', models:[{ uid:'m1', baseProgression:{ xp:1 } }] };
  const wActive = {
    context: 'free',
    battle: { participants: [
      { warbandId:'wb_x', modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false, kills:0 }] },
    ]},
  };
  ok(wizardHasAdvancements(wActive, { getWarband: (id) => id === 'wb_x' ? wb : null }) === true,
     'XP 1 + 1 survival = 2 → crosses first threshold');

  // Same setup but model already at 1 with 0 gain (didn't participate)
  const wIdle = {
    context: 'free',
    battle: { participants: [
      { warbandId:'wb_x', modelOutcomes:[{ modelUid:'m1', participated:false }] },
    ]},
  };
  ok(wizardHasAdvancements(wIdle, { getWarband: () => wb }) === false,
     'no XP gained → no threshold crossed');

  // Gain but already past the next threshold (e.g., 2 → 3, still 1 advancement)
  const wbMid = { id:'wb_x', models:[{ uid:'m1', baseProgression:{ xp:2 } }] };
  const wMid = {
    context: 'free',
    battle: { participants: [
      { warbandId:'wb_x', modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false }] },
    ]},
  };
  ok(wizardHasAdvancements(wMid, { getWarband: () => wbMid }) === false,
     'XP 2 → 3: same advancement count, no new threshold');
});

/* ------------------------------------------------------------------ */
group('Group 7: wizardHasAdvancements — degenerate inputs', () => {
  ok(wizardHasAdvancements(null, {}) === false, 'null wizard → false');
  ok(wizardHasAdvancements({}, {}) === false, 'empty wizard → false');
  ok(wizardHasAdvancements({ battle:{ participants:[] } }, {}) === false, 'no participants → false');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
