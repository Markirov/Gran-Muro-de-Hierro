/* Test for P1/2: cannotGainXp (Head Wound) honoured on read
 *
 * Canon p.117: a model that suffered Head Wound trauma can no longer
 * gain XP. applyWizardOutcomesToWarband already SETS the flag (Fase
 * 4.7); the read side (computeModelXPGain) didn't HONOUR it. A
 * head-wounded model kept accruing XP from kills/feats/survival.
 *
 * Fix: computeModelXPGain accepts an optional model param. When the
 * model is present and m.baseProgression.cannotGainXp === true, the
 * function returns 0 regardless of the outcome.
 *
 * Back-compat: existing callers without a model arg keep getting the
 * old (uncapped) behaviour, which is what the test fixtures from
 * Fase 4.4 expect.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_cannot_gain_xp.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  computeModelXPGain, wizardHasAdvancements,
  newWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
  wizardBattleToFreeBattle, applyWizardOutcomesToWarband,
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
const { computeModelXPGain, wizardHasAdvancements, newWarband,
        startLiveFreeBattle, SCENARIOS_CATALOG,
        wizardBattleToFreeBattle, applyWizardOutcomesToWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: computeModelXPGain — flag short-circuits to 0', () => {
  const out = { participated:true, outOfAction:false, kills:3, feats:1 };
  const model = { uid:'m1', baseProgression:{ xp:5, cannotGainXp:true } };
  ok(computeModelXPGain(out, model) === 0, 'flag=true → 0 XP regardless of outcome');
  // Sanity: same outcome without model returns +1 survival + 3 kills + 1 feat = 5
  ok(computeModelXPGain(out) === 5, 'no model arg: legacy behaviour (5 XP)');
});

group('Group 2: computeModelXPGain — flag false / missing leaves behaviour intact', () => {
  const out = { participated:true, outOfAction:false, kills:2 };
  const model = { uid:'m1', baseProgression:{ xp:5, cannotGainXp:false } };
  ok(computeModelXPGain(out, model) === 3, 'flag=false: +1 +2 = 3');

  const model2 = { uid:'m2', baseProgression:{ xp:5 } };  // no flag
  ok(computeModelXPGain(out, model2) === 3, 'flag absent: same as legacy');

  const model3 = { uid:'m3' };  // no baseProgression
  ok(computeModelXPGain(out, model3) === 3, 'no baseProgression: same as legacy');
});

/* ------------------------------------------------------------------ */
group('Group 3: end-to-end via applyWizardOutcomesToWarband', () => {
  // Setup: m1 already head-wounded from a prior save, m2 is healthy.
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_2', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{
        warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0,
        modelOutcomes:[
          { modelUid:'m1', participated:true, outOfAction:false, kills:2, feats:1 },
          { modelUid:'m2', participated:true, outOfAction:false, kills:1, feats:0 },
        ],
      }],
      discoveries:[],
    },
  };
  // Wizard-to-FreeBattle conversion: xpAwarded should already exclude m1
  // because the conversion happens with model context (see fix below).
  // For now we test the end-to-end mutation: m1.xp must NOT increase.
  const wb = {
    id:'wb_x', factionId:'new-antioch',
    models:[
      { uid:'m1', baseProgression:{ xp:5, advancements:[], scars:[], cannotGainXp:true } },
      { uid:'m2', baseProgression:{ xp:3, advancements:[], scars:[] } },
    ],
    discoveredLocations:[],
  };
  const fb = wizardBattleToFreeBattle(W, { wb });
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.models[0].baseProgression.xp === 5, 'm1 (head-wounded) XP stays 5');
  // m2 outcome: participated + survived + 1 kill = +2; starts at 3, ends at 5
  ok(wb.models[1].baseProgression.xp === 5, 'm2 (healthy) +1 survival +1 kill = 5');
});

/* ------------------------------------------------------------------ */
group('Group 4: wizardHasAdvancements respects flag in free context', () => {
  // m1 is head-wounded at XP just below threshold. Without flag honour,
  // this would falsely report an advancement crossing.
  const wb = {
    id:'wb_x',
    models:[{ uid:'m1', baseProgression:{ xp:1, cannotGainXp:true } }],
  };
  const W = {
    context:'free',
    battle:{ participants:[{
      warbandId:'wb_x',
      modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false }],
    }]},
  };
  ok(wizardHasAdvancements(W, { getWarband: () => wb }) === false,
     'head-wounded model: no XP gain → no threshold crossing');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
