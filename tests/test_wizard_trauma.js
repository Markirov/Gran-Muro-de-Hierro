/* Test for Fase 4.3: Trauma step — helpers + free-context compatibility
 *
 * Scope: thin pass over the existing renderWizardInjuries logic.
 *   - wizardHasCasualties(): pure helper, true iff any participant has at
 *     least one (participated && outOfAction) modelOutcome.
 *   - Trauma step auto-skips forward when no casualties exist, instead of
 *     showing an empty "Ningún modelo quedó OoA" body the user has to
 *     manually click past.
 *   - Free-context trauma iterates the single LFB participant correctly.
 *
 * Trauma-table upgrade (1d6 -> D66) is intentionally out of scope: the
 * wizard's existing 1d6 injuryTable stays here. The D66 traumaTable used
 * by Battle Tracker is a separate concern we can revisit in BACKLOG.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard,
  closeWizard,
  startLiveFreeBattle,
  wizardHasCasualties: typeof wizardHasCasualties === 'function' ? wizardHasCasualties : null,
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
const { startWizard, closeWizard, startLiveFreeBattle, wizardHasCasualties,
        SCENARIOS_CATALOG, getWizard, setCampaign } = lib;

if (!wizardHasCasualties) { console.error('✗ wizardHasCasualties not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const mockCampaign = { id:'cmp_t', name:'T', warbandIds:['wb_x'], battles:[], rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} };
const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

function fakeBattle(participants) {
  return { battle: { participants } };
}

/* ------------------------------------------------------------------ */
group('Group 1: wizardHasCasualties — accepts WIZARD-like input', () => {
  ok(wizardHasCasualties(null) === false, 'null wizard → false');
  ok(wizardHasCasualties({}) === false, 'wizard without battle → false');
  ok(wizardHasCasualties({ battle:{} }) === false, 'battle without participants → false');
  ok(wizardHasCasualties(fakeBattle([])) === false, 'empty participants → false');
});

/* ------------------------------------------------------------------ */
group('Group 2: wizardHasCasualties — counts OoA correctly', () => {
  const noOoa = fakeBattle([{
    warbandId:'wb_x',
    modelOutcomes: [
      { modelUid:'m1', participated:true,  outOfAction:false },
      { modelUid:'m2', participated:true,  outOfAction:false },
    ],
  }]);
  ok(wizardHasCasualties(noOoa) === false, 'no OoA across participants → false');

  const oneOoa = fakeBattle([{
    warbandId:'wb_x',
    modelOutcomes: [
      { modelUid:'m1', participated:true, outOfAction:true },
      { modelUid:'m2', participated:true, outOfAction:false },
    ],
  }]);
  ok(wizardHasCasualties(oneOoa) === true, 'one OoA → true');

  const ooaButNotParticipated = fakeBattle([{
    warbandId:'wb_x',
    modelOutcomes: [{ modelUid:'m1', participated:false, outOfAction:true }],
  }]);
  ok(wizardHasCasualties(ooaButNotParticipated) === false,
     'OoA marked but did not participate → ignored (false)');
});

/* ------------------------------------------------------------------ */
group('Group 3: multi-participant scan', () => {
  const multi = fakeBattle([
    { warbandId:'wb_a', modelOutcomes: [{ modelUid:'m1', participated:true, outOfAction:false }] },
    { warbandId:'wb_b', modelOutcomes: [{ modelUid:'m2', participated:true, outOfAction:true  }] },
  ]);
  ok(wizardHasCasualties(multi) === true, 'OoA in second participant → true');

  const multiNone = fakeBattle([
    { warbandId:'wb_a', modelOutcomes: [{ modelUid:'m1', participated:true, outOfAction:false }] },
    { warbandId:'wb_b', modelOutcomes: [{ modelUid:'m2', participated:true, outOfAction:false }] },
  ]);
  ok(wizardHasCasualties(multiNone) === false, 'no OoA across two participants → false');
});

/* ------------------------------------------------------------------ */
group('Group 4: integration with live WIZARD', () => {
  setCampaign(mockCampaign);
  startWizard();
  const w = getWizard();
  // Fresh wizard → empty participants → no casualties.
  ok(wizardHasCasualties(w) === false, 'fresh wizard has no casualties');
  // Inject a participant with one OoA and re-check.
  w.battle.participants.push({
    warbandId: 'wb_x',
    modelOutcomes: [{ modelUid:'mtest', participated:true, outOfAction:true }],
  });
  ok(wizardHasCasualties(w) === true, 'after injection: casualties detected');
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 5: free-context wizard has trauma step', () => {
  setCampaign(mockCampaign);
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: FIRST_SCENARIO });
  startWizard({ context:'free', lfb });
  const w = getWizard();
  const traumaStep = w.steps.find(s => s.id === 'trauma');
  ok(!!traumaStep, 'free context still includes trauma step');
  // Pre-filled participant has zero modelOutcomes (no warband loaded in
  // test mode), so casualties=false is the expected baseline.
  ok(wizardHasCasualties(w) === false, 'free wizard with empty modelOutcomes → no casualties');
  closeWizard();
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
