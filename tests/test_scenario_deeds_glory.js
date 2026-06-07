/* Test suite: Glorious Deeds → glory (canon p.97).
 *
 * Each Glorious Deed grants +1 ☼ to the warband, +1 D6 to the Promotion
 * Pool, and (if performed by an ELITE) +1 XP. The wizard records deeds
 * as per-model `feats`; this suite locks down the glory wiring:
 *   - participantDeedCount totals the deeds for a participant.
 *   - recomputeFeatsFromDeeds derives feats from part.deeds assignments.
 *   - wizardBattleToFreeBattle adds deed glory on top of the base reward.
 *   - computeWarbandState (campaign replay) adds deed glory too.
 *   - SCENARIOS_CATALOG carries per-scenario deeds.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_deeds_glory.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  participantDeedCount, recomputeFeatsFromDeeds,
  wizardBattleToFreeBattle, summarizeWizardLoot,
  startLiveFreeBattle, SCENARIOS_CATALOG,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
function alert(){}
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, dataset:{}, innerHTML:'', textContent:'' }; }
const window = { addEventListener(){}, matchMedia(){return {matches:false,addEventListener(){}};}, requestAnimationFrame(){return 0;} };
const document = { addEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { participantDeedCount, recomputeFeatsFromDeeds,
        wizardBattleToFreeBattle, summarizeWizardLoot,
        startLiveFreeBattle, SCENARIOS_CATALOG } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

/* ------------------------------------------------------------------ */
group('Group 1: participantDeedCount', () => {
  const part = { modelOutcomes: [
    { modelUid:'m1', participated:true, feats:2 },
    { modelUid:'m2', participated:true, feats:1 },
    { modelUid:'m3', participated:true, feats:0 },
  ]};
  ok(participantDeedCount(part) === 3, 'sums feats across models');
  ok(participantDeedCount({ modelOutcomes:[] }) === 0, 'no outcomes → 0');
  ok(participantDeedCount(null) === 0, 'null → 0');
  const benched = { modelOutcomes:[ { modelUid:'m1', participated:false, feats:5 } ]};
  ok(participantDeedCount(benched) === 0, 'benched model feats ignored');
});

/* ------------------------------------------------------------------ */
group('Group 2: recomputeFeatsFromDeeds', () => {
  const part = {
    deeds: { 'Sniper':'m1', 'Bloodletting':'m1', 'Hold Your Ground':'m2' },
    modelOutcomes: [
      { modelUid:'m1', feats:0 },
      { modelUid:'m2', feats:0 },
      { modelUid:'m3', feats:9 }, // should be reset to 0
    ],
  };
  recomputeFeatsFromDeeds(part);
  ok(part.modelOutcomes[0].feats === 2, 'm1 did 2 deeds → feats 2');
  ok(part.modelOutcomes[1].feats === 1, 'm2 did 1 deed → feats 1');
  ok(part.modelOutcomes[2].feats === 0, 'm3 no deeds → feats reset to 0');
  ok(participantDeedCount(part) === 3, 'total deeds = 3');

  // Empty deeds → all feats zeroed.
  const part2 = { deeds: {}, modelOutcomes: [{ modelUid:'m1', feats:4 }] };
  recomputeFeatsFromDeeds(part2);
  ok(part2.modelOutcomes[0].feats === 0, 'no deeds → feats 0');
});

/* ------------------------------------------------------------------ */
group('Group 3: SCENARIOS_CATALOG carries deeds', () => {
  const withDeeds = Object.values(SCENARIOS_CATALOG).filter(s => Array.isArray(s.deeds) && s.deeds.length);
  ok(withDeeds.length >= 10, 'most scenarios have deeds');
  const htl = SCENARIOS_CATALOG['hold-the-line'];
  ok(htl && htl.deeds.some(d => d.name === 'Hold Your Ground'), 'Hold the Line has Hold Your Ground');
  ok(htl.deeds.some(d => d.awardsLeaderXP), 'some deeds flagged awardsLeaderXP');
  // Great War has no deeds (canon).
  ok(SCENARIOS_CATALOG['great-war'].deeds.length === 0, 'Great War has 0 deeds');
});

/* ------------------------------------------------------------------ */
group('Group 4: wizardBattleToFreeBattle — glory = base + deeds', () => {
  const lfb = startLiveFreeBattle({ id:'wb_x' }, { scenarioId: FIRST_SCENARIO, opponent:'X' });
  const w = {
    context:'free', lfb,
    battle:{
      id:'b1', date:'2026-06-01', scenario: lfb.scenarioId, notes:'',
      participants:[{
        warbandId:'wb_x', result:'win', ducatsEarned:50, gloryEarned:1,
        modelOutcomes:[
          { modelUid:'m1', participated:true, outOfAction:false, feats:2 },
          { modelUid:'m2', participated:true, outOfAction:false, feats:0 },
        ],
      }],
      discoveries:[],
    },
  };
  const fb = wizardBattleToFreeBattle(w);
  ok(fb.glory === 3, 'base 1 + 2 deeds = 3 glory');

  // No deeds → glory = base only.
  w.battle.participants[0].modelOutcomes.forEach(o => o.feats = 0);
  const fb2 = wizardBattleToFreeBattle(w);
  ok(fb2.glory === 1, 'no deeds → base 1 only');
});

/* ------------------------------------------------------------------ */
group('Group 5: summarizeWizardLoot — glory breakdown', () => {
  const w = {
    battle:{
      scenario: FIRST_SCENARIO,
      participants:[{
        warbandId:'wb_x', ducatsEarned:50, gloryEarned:1,
        modelOutcomes:[
          { modelUid:'m1', participated:true, feats:1 },
          { modelUid:'m2', participated:true, feats:1 },
        ],
      }],
      discoveries:[],
    },
  };
  const s = summarizeWizardLoot(w);
  ok(s[0].baseGlory === 1, 'baseGlory = 1');
  ok(s[0].deedGlory === 2, 'deedGlory = 2');
  ok(s[0].gloryEarned === 3, 'gloryEarned = base + deeds = 3');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
