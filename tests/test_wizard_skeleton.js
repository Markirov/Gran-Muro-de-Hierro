/* Test for Fase 4.1: Wizard skeleton + context + skip plumbing
 *
 * Scope is intentionally narrow: this is the plumbing pass. Step
 * content stays as-is (Fase 4.2+ will rename/reorder). We verify:
 *   - startWizard(opts) accepts context and stashes it on WIZARD
 *   - free-battle context requires an lfb
 *   - back-compat: startWizard() with no args = campaign
 *   - canSkipWizardStep(step) returns a boolean per step
 *   - skipWizardStep advances step without invoking collect
 *   - "Saltar paso" button exists in the wizard markup
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Could not locate inline <script>');
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
if (bootIdx < 0) throw new Error('Could not locate boot()');

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_1.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard: typeof startWizard === 'function' ? startWizard : null,
  closeWizard: typeof closeWizard === 'function' ? closeWizard : null,
  canSkipWizardStep: typeof canSkipWizardStep === 'function' ? canSkipWizardStep : null,
  skipWizardStep: typeof skipWizardStep === 'function' ? skipWizardStep : null,
  startLiveFreeBattle: typeof startLiveFreeBattle === 'function' ? startLiveFreeBattle : null,
  SCENARIOS_CATALOG: typeof SCENARIOS_CATALOG !== 'undefined' ? SCENARIOS_CATALOG : null,
  STATE: typeof STATE !== 'undefined' ? STATE : null,
  getWizard: () => (typeof WIZARD !== 'undefined' ? WIZARD : null),
  setWizardStep: (n) => { if (typeof WIZARD !== 'undefined' && WIZARD) WIZARD.step = n; },
  // a sentinel for state.currentCampaign mocking
  setCampaign: (c) => { if (typeof STATE !== 'undefined') STATE.currentCampaign = c; },
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

let lib;
try { lib = require(TMP); }
catch (e) { console.error('Failed to load module:', e.message); process.exit(1); }

const { startWizard, closeWizard, canSkipWizardStep, skipWizardStep,
        startLiveFreeBattle, SCENARIOS_CATALOG, STATE, getWizard,
        setWizardStep, setCampaign } = lib;

if (!startWizard) { console.error('✗ startWizard not exported'); process.exit(1); }
if (!canSkipWizardStep) { console.error('✗ canSkipWizardStep not exported'); process.exit(1); }
if (!skipWizardStep) { console.error('✗ skipWizardStep not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); pass++; }
  else      { console.log('  ✗ ' + msg); fail++; }
}
function group(name, fn) { console.log('\n' + name); fn(); }

// Mock a campaign with one warband for tests that need it
const mockCampaign = { id: 'cmp_test', name: 'Test Camp', warbandIds: ['wb_x'], battles: [], rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} };
const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

/* ------------------------------------------------------------------ */
/* Group 1: Context plumbing                                          */
/* ------------------------------------------------------------------ */
group('Group 1: context plumbing', () => {
  setCampaign(mockCampaign);

  startWizard();
  let w = getWizard();
  ok(w !== null, 'no-arg startWizard creates WIZARD');
  ok(w && w.context === 'campaign', 'no-arg defaults to context=campaign (back-compat)');
  closeWizard();

  startWizard({ context: 'campaign' });
  w = getWizard();
  ok(w && w.context === 'campaign', 'explicit campaign context honoured');
  closeWizard();

  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: FIRST_SCENARIO });
  startWizard({ context: 'free', lfb });
  w = getWizard();
  ok(w !== null, 'free context creates WIZARD');
  ok(w && w.context === 'free', 'free context honoured');
  ok(w && w.lfb && w.lfb.id === lfb.id, 'lfb is stashed on WIZARD');
  closeWizard();
});

/* ------------------------------------------------------------------ */
/* Group 2: Validation                                                */
/* ------------------------------------------------------------------ */
group('Group 2: validation', () => {
  setCampaign(mockCampaign);

  // Free context without lfb: should refuse (no WIZARD created)
  startWizard({ context: 'free' });
  ok(getWizard() === null, 'free context without lfb refuses to start');
  closeWizard();

  // Campaign context without a campaign: should refuse
  setCampaign(null);
  startWizard({ context: 'campaign' });
  ok(getWizard() === null, 'campaign context without currentCampaign refuses');
  setCampaign(mockCampaign);
  closeWizard();

  // Unknown context: refuse
  startWizard({ context: 'nonsense' });
  ok(getWizard() === null, 'unknown context refuses');
});

/* ------------------------------------------------------------------ */
/* Group 3: Skip mechanics                                            */
/* ------------------------------------------------------------------ */
group('Group 3: skip mechanics', () => {
  setCampaign(mockCampaign);
  startWizard();
  let w = getWizard();
  ok(w !== null, 'wizard started for skip tests');

  // canSkipWizardStep returns boolean for every step
  for (let i = 0; i < w.steps.length; i++) {
    ok(typeof canSkipWizardStep(i) === 'boolean', `canSkipWizardStep(${i}) returns boolean`);
  }
  // Step 0 (Setup) must NOT be skippable — required for downstream steps
  ok(canSkipWizardStep(0) === false, 'step 0 (Setup) is not skippable');

  // skipWizardStep advances step without invoking collect
  setWizardStep(2);
  const stepBefore = getWizard().step;
  skipWizardStep();
  const stepAfter = getWizard().step;
  ok(stepAfter === stepBefore + 1, 'skipWizardStep advances by 1');

  // Skipping past last step is a no-op (wizard remains, doesn't save)
  setWizardStep(w.steps.length - 1);
  skipWizardStep();
  ok(getWizard() !== null, 'skip on final step does not save/close wizard');

  closeWizard();
});

/* ------------------------------------------------------------------ */
/* Group 4: Free-battle context inherits LIVE_FREE_BATTLE data        */
/* ------------------------------------------------------------------ */
group('Group 4: free-battle context inherits lfb', () => {
  setCampaign(mockCampaign);
  const lfb = startLiveFreeBattle({id:'wb_x', name:'Test Wb'}, {
    scenarioId: FIRST_SCENARIO,
    opponent: 'Heretic Legions',
    dicePicked: 5,
  });
  startWizard({ context: 'free', lfb });
  const w = getWizard();
  ok(w !== null, 'wizard starts in free context');
  // In free context, scenario should be pre-filled from lfb
  ok(w && w.battle && w.battle.scenario === lfb.scenarioId,
     'battle.scenario inherits lfb.scenarioId');
  // Single-warband participant pre-filled from lfb
  ok(w && Array.isArray(w.battle.participants) && w.battle.participants.length === 1,
     'free context pre-fills exactly one participant');
  closeWizard();
});

/* ------------------------------------------------------------------ */
/* Group 5: DOM markup                                                */
/* ------------------------------------------------------------------ */
group('Group 5: DOM markup', () => {
  ok(html.includes('id="wizard-skip"'), 'wizard-skip button exists in HTML');
});

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
