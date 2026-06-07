/* Test for P1/2: cannotGainXp (Head Wound) honoured on read
 *
 * Canon p.117: a model that suffered Head Wound trauma can no longer
 * gain XP. applyWizardOutcomesToWarband sets the flag (Fase 4.7);
 * computeModelXPGain must honour it on the read side.
 *
 * Also exercises the canon-fidelity invariants:
 *   - Only ELITE models gain XP (Troops use Promotion Pool).
 *   - +1 XP per ELITE survivor, even if OoA.
 *   - +1 XP cap from Glorious Deeds, regardless of count.
 *   - Kills don't grant XP.
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

function eliteModel(uid, xp, extra) {
  return Object.assign(
    { uid, baseProgression: Object.assign(
      { xp: xp || 0, advancements: [], scars: [], promotedToElite: true },
      extra || {}
    )},
  );
}

/* ------------------------------------------------------------------ */
group('Group 1: computeModelXPGain — cannotGainXp short-circuits to 0', () => {
  const out = { participated:true, outOfAction:false, kills:3, feats:1 };
  const model = eliteModel('m1', 5, { cannotGainXp: true });
  ok(computeModelXPGain(out, model) === 0, 'flag=true → 0 XP regardless of outcome');
});

group('Group 2: computeModelXPGain — flag false / missing leaves canon path intact', () => {
  const out = { participated:true, outOfAction:false, feats:1 };
  const m1 = eliteModel('m1', 5, { cannotGainXp: false });
  ok(computeModelXPGain(out, m1) === 2, 'flag=false: +1 survival + 1 Deed cap = 2');

  const m2 = eliteModel('m2', 5);  // no flag
  ok(computeModelXPGain(out, m2) === 2, 'flag absent: same canon math');

  // Kills don't matter — canon doesn't grant per-kill XP.
  const outKills = { participated:true, outOfAction:false, kills:5 };
  ok(computeModelXPGain(outKills, eliteModel('m3', 0)) === 1,
     '5 kills, no Deed → +1 survival only');
});

/* ------------------------------------------------------------------ */
group('Group 3: end-to-end via applyWizardOutcomesToWarband', () => {
  // m1 head-wounded from a prior battle, m2 healthy. Both ELITE.
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
  const wb = {
    id:'wb_x', factionId:'new-antioch',
    models:[
      eliteModel('m1', 5, { cannotGainXp: true }),
      eliteModel('m2', 3),
    ],
    discoveredLocations:[],
  };
  const fb = wizardBattleToFreeBattle(W, { wb });
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.models[0].baseProgression.xp === 5, 'm1 (head-wounded) XP stays 5');
  // m2: +1 survival + 0 deed = 1; starts at 3, ends at 4
  ok(wb.models[1].baseProgression.xp === 4, 'm2 (healthy) +1 survival = 4');
});

/* ------------------------------------------------------------------ */
group('Group 4: wizardHasAdvancements respects flag in free context', () => {
  const wb = {
    id:'wb_x',
    models:[eliteModel('m1', 1, { cannotGainXp: true })],
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
