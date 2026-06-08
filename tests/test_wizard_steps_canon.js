/* Test for Fase 4.2: Wizard steps renamed + reordered toward canon
 *
 * 4.2 is structural: WIZARD.steps becomes a list of {id,label} objects
 * with stable ids, switched on by id rather than index. Three new
 * placeholder steps are inserted (exploration, quartermaster, resumen).
 * Free context drops the setup step since LIVE_FREE_BATTLE carries it.
 *
 * Step renderer/collect content stays the same in 4.2 — body migration
 * happens in 4.3+.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_2.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard,
  closeWizard,
  canSkipWizardStep,
  skipWizardStep,
  startLiveFreeBattle,
  SCENARIOS_CATALOG,
  STATE,
  getWizard: () => (typeof WIZARD !== 'undefined' ? WIZARD : null),
  setCampaign: (c) => { STATE.currentCampaign = c; },
  // Verify the new placeholder renderers exist
  hasExplorationRenderer: typeof renderWizardExploration === 'function',
  hasQMRenderer: typeof renderWizardQuartermaster === 'function',
  hasSummaryRenderer: typeof renderWizardSummary === 'function',
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
const { startWizard, closeWizard, canSkipWizardStep, startLiveFreeBattle,
        SCENARIOS_CATALOG, getWizard, setCampaign,
        hasExplorationRenderer, hasQMRenderer, hasSummaryRenderer } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); pass++; }
  else      { console.log('  ✗ ' + msg); fail++; }
}
function group(name, fn) { console.log('\n' + name); fn(); }

const mockCampaign = { id:'cmp_t', name:'T', warbandIds:['wb_x'], battles:[], rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} };
const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

// "resultados" eliminado: el dinero viene del Looting de Exploración y la
// gloria de los Glorious Deeds; no hay recompensa fija por resultado.
const CAMPAIGN_CANON = ['setup','modelos','trauma','promotions-xp','exploration','quartermaster','resumen'];
const FREE_CANON     = ['modelos','trauma','promotions-xp','exploration','quartermaster','resumen'];

/* ------------------------------------------------------------------ */
group('Group 1: WIZARD.steps shape', () => {
  setCampaign(mockCampaign);
  startWizard();
  const w = getWizard();
  ok(Array.isArray(w.steps), 'steps is an array');
  ok(w.steps.length > 0, 'steps non-empty');
  ok(w.steps.every(s => typeof s === 'object' && typeof s.id === 'string' && typeof s.label === 'string'),
     'every step is {id:string,label:string}');
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 2: Campaign step ids/order match canon', () => {
  setCampaign(mockCampaign);
  startWizard({ context:'campaign' });
  const ids = getWizard().steps.map(s => s.id);
  ok(ids.length === CAMPAIGN_CANON.length, `campaign has ${CAMPAIGN_CANON.length} steps (got ${ids.length})`);
  for (let i = 0; i < CAMPAIGN_CANON.length; i++) {
    ok(ids[i] === CAMPAIGN_CANON[i], `step ${i} is "${CAMPAIGN_CANON[i]}" (got "${ids[i]}")`);
  }
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 3: Free step ids/order match canon (no setup)', () => {
  setCampaign(mockCampaign);
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: FIRST_SCENARIO });
  startWizard({ context:'free', lfb });
  const ids = getWizard().steps.map(s => s.id);
  ok(ids.length === FREE_CANON.length, `free has ${FREE_CANON.length} steps (got ${ids.length})`);
  ok(!ids.includes('setup'), 'free context omits setup');
  for (let i = 0; i < FREE_CANON.length; i++) {
    ok(ids[i] === FREE_CANON[i], `step ${i} is "${FREE_CANON[i]}" (got "${ids[i]}")`);
  }
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 4: Step labels are user-facing strings', () => {
  setCampaign(mockCampaign);
  startWizard();
  const w = getWizard();
  ok(w.steps.find(s => s.id === 'trauma').label.toLowerCase().includes('trauma'),
     'trauma step has "Trauma" in label');
  ok(/promotion|xp|ascen/i.test(w.steps.find(s => s.id === 'promotions-xp').label),
     'promotions-xp label mentions Promotions/XP/Ascensos');
  ok(/explor/i.test(w.steps.find(s => s.id === 'exploration').label),
     'exploration label mentions Exploration');
  ok(/quartermaster|intendencia|qm/i.test(w.steps.find(s => s.id === 'quartermaster').label),
     'quartermaster label is recognisable');
  ok(/resumen|summary/i.test(w.steps.find(s => s.id === 'resumen').label),
     'resumen label is recognisable');
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 5: Skip eligibility (by step id, not index)', () => {
  setCampaign(mockCampaign);
  startWizard();
  const w = getWizard();
  const setupIdx = w.steps.findIndex(s => s.id === 'setup');
  ok(canSkipWizardStep(setupIdx) === false, 'setup is not skippable');
  const traumaIdx = w.steps.findIndex(s => s.id === 'trauma');
  ok(canSkipWizardStep(traumaIdx) === true, 'trauma is skippable (no casualties = nothing to roll)');
  const promoIdx = w.steps.findIndex(s => s.id === 'promotions-xp');
  ok(canSkipWizardStep(promoIdx) === true, 'promotions-xp is skippable');
  const explIdx = w.steps.findIndex(s => s.id === 'exploration');
  ok(canSkipWizardStep(explIdx) === true, 'exploration is skippable (0 dice = no rolls)');
  const qmIdx = w.steps.findIndex(s => s.id === 'quartermaster');
  ok(canSkipWizardStep(qmIdx) === true, 'quartermaster is skippable');
  const resIdx = w.steps.findIndex(s => s.id === 'resumen');
  ok(canSkipWizardStep(resIdx) === false, 'resumen (last/summary) is NOT skippable');
  closeWizard();
});

/* ------------------------------------------------------------------ */
group('Group 6: Placeholder renderers exist', () => {
  ok(hasExplorationRenderer, 'renderWizardExploration defined');
  ok(hasQMRenderer, 'renderWizardQuartermaster defined');
  ok(hasSummaryRenderer, 'renderWizardSummary defined');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
