/* Test for Fase 4.7: Resumen step + save path (free context)
 *
 * Closes Fase 4. The wizard now persists free battles end-to-end:
 *   1. wizardBattleToFreeBattle(W): converts WIZARD.battle into a
 *      FreeBattle (shape from createFreeBattle), filling result, loot,
 *      glory, xpAwarded, traumaResults, discoveries, notes.
 *   2. applyWizardOutcomesToWarband(wb, W, fb): mutates the warband in
 *      place — appends XP, advancements, scars to baseProgression,
 *      sets cannotGainXp on Head Wound, merges discoveredLocations.
 *   3. The save handler ties them together with addFreeBattle.
 *
 * Tests focus on the two pure helpers. The save handler itself is
 * exercised at the boundary via a mock loadWarband.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_7.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard, closeWizard, startLiveFreeBattle,
  wizardBattleToFreeBattle: typeof wizardBattleToFreeBattle === 'function' ? wizardBattleToFreeBattle : null,
  applyWizardOutcomesToWarband: typeof applyWizardOutcomesToWarband === 'function' ? applyWizardOutcomesToWarband : null,
  createFreeBattle,
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
const { wizardBattleToFreeBattle, applyWizardOutcomesToWarband,
        startLiveFreeBattle, SCENARIOS_CATALOG } = lib;

if (!wizardBattleToFreeBattle) { console.error('✗ wizardBattleToFreeBattle not exported'); process.exit(1); }
if (!applyWizardOutcomesToWarband) { console.error('✗ applyWizardOutcomesToWarband not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];

function makeWizardFree(overrides) {
  const lfb = startLiveFreeBattle({ id:'wb_x' }, { scenarioId: FIRST_SCENARIO, opponent: 'Heretics', dicePicked: 4 });
  const w = {
    context: 'free',
    lfb,
    battle: {
      id: 'btl_1',
      date: '2026-05-11',
      scenario: lfb.scenarioId,
      notes: '',
      participants: [{
        warbandId: 'wb_x',
        result: 'win',
        ducatsEarned: 50,
        gloryEarned: 1,
        modelOutcomes: [
          { modelUid:'m1', participated:true, outOfAction:false, kills:2, feats:1 },
          { modelUid:'m2', participated:true, outOfAction:true,  kills:0, feats:0, injury:{ id:'old-wound', name:'Old Wound' } },
        ],
      }],
      discoveries: [{ warbandId:'wb_x', dice:[3,3,2,2], rollTotal: 10, result:{ kind:'discovery', entry:{ name:'Test Loot', roll:10 }, lootDucats: 100 } }],
    },
  };
  if (overrides) Object.assign(w, overrides);
  return w;
}

/* ------------------------------------------------------------------ */
group('Group 1: wizardBattleToFreeBattle — basic conversion', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  ok(typeof fb === 'object' && fb.origin === 'free', 'returns FreeBattle (origin=free)');
  ok(fb.scenarioId === FIRST_SCENARIO, 'scenarioId from lfb');
  ok(fb.opponent === 'Heretics', 'opponent from lfb');
  ok(fb.dicePicked === 4, 'dicePicked from lfb');
  ok(fb.result === 'win', 'result from participant');
  // Canon p.113 — loot = base ducats (50) + exploration Looting (rollTotal×10
  // = 100 from the discovery) = 150.
  ok(fb.loot === 150, 'loot = base + exploration Looting');
  // Canon p.97 — base glory (1) + 1 Glorious Deed (m1 feats:1) = 2.
  ok(fb.glory === 2, 'glory = base reward + deeds');
  ok(typeof fb.completedAt === 'string' && fb.completedAt.length > 10, 'completedAt set');
});

/* ------------------------------------------------------------------ */
group('Group 2: wizardBattleToFreeBattle — xpAwarded map (canon)', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  // No wb resolution here (mock stub returns null from loadWarband), so the
  // ELITE gate falls through. Canon math applies regardless:
  //   m1: participated + survived + 1 Deed cap = 2 XP. Kills ignored.
  //   m2: participated + OoA + survived old-wound = +1 (canon p.103: even if OoA).
  ok(fb.xpAwarded.m1 === 2, 'm1 awarded 2 XP (1 survival + 1 Deed cap)');
  ok(fb.xpAwarded.m2 === 1, 'm2 OoA but survived → +1 XP');
});

/* ------------------------------------------------------------------ */
group('Group 3: wizardBattleToFreeBattle — traumaResults from injuries', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  ok(Array.isArray(fb.traumaResults) && fb.traumaResults.length === 1, 'one trauma result captured');
  ok(fb.traumaResults[0].modelUid === 'm2', 'trauma references m2');
  ok(fb.traumaResults[0].id === 'old-wound', 'trauma injury id preserved');
});

/* ------------------------------------------------------------------ */
group('Group 4: wizardBattleToFreeBattle — discoveries captured', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  ok(Array.isArray(fb.discoveries) && fb.discoveries.length === 1, 'one discovery recorded');
  ok(fb.discoveries[0].kind === 'discovery', 'kind preserved');
  ok(fb.discoveries[0].key === 'common:10', 'key = tableName:rollTotal');

  // Pillaged: still recorded (loot was earned) but key is null/absent
  const wPill = makeWizardFree();
  wPill.battle.discoveries[0].result = { kind:'pillaged', lootDucats: 100, reason:'no-entry' };
  const fbPill = wizardBattleToFreeBattle(wPill);
  ok(fbPill.discoveries.length === 1 && fbPill.discoveries[0].kind === 'pillaged',
     'pillaged result still recorded');
});

/* ------------------------------------------------------------------ */
group('Group 5: applyWizardOutcomesToWarband — XP applied (canon)', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  const wb = {
    id: 'wb_x',
    factionId: 'new-antioch',
    models: [
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2' }, // no baseProgression
    ],
    discoveredLocations: [],
  };
  applyWizardOutcomesToWarband(wb, w, fb);
  // m1: starts 1, gains 2 (survival + Deed cap) = 3
  ok(wb.models[0].baseProgression.xp === 3, 'm1 XP 1 + 2 = 3');
  // m2: bp created; gains +1 (canon: OoA survivor still gets +1)
  ok(!!wb.models[1].baseProgression, 'm2 baseProgression created');
  ok((wb.models[1].baseProgression.xp || 0) === 1, 'm2 OoA survived → +1');
});

/* ------------------------------------------------------------------ */
group('Group 6: applyWizardOutcomesToWarband — scars from injury', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  const wb = {
    id: 'wb_x',
    models: [
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2', baseProgression:{ xp:0, advancements:[], scars:[] } },
    ],
    discoveredLocations: [],
  };
  applyWizardOutcomesToWarband(wb, w, fb);
  ok(wb.models[1].baseProgression.scars.length === 1, 'm2 has 1 scar');
  ok(wb.models[1].baseProgression.scars[0].id === 'old-wound', 'scar id preserved');
});

/* ------------------------------------------------------------------ */
group('Group 7: applyWizardOutcomesToWarband — head-wound sets cannotGainXp', () => {
  const w = makeWizardFree();
  // Replace m2 injury with head-wound
  w.battle.participants[0].modelOutcomes[1].injury = { id:'head-wound', name:'Head Wound' };
  const fb = wizardBattleToFreeBattle(w);
  const wb = {
    id: 'wb_x',
    models: [
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2', baseProgression:{ xp:0, advancements:[], scars:[] } },
    ],
    discoveredLocations: [],
  };
  applyWizardOutcomesToWarband(wb, w, fb);
  ok(wb.models[1].baseProgression.cannotGainXp === true, 'm2 cannotGainXp set');
});

/* ------------------------------------------------------------------ */
group('Group 8: applyWizardOutcomesToWarband — discoveredLocations', () => {
  const w = makeWizardFree();
  const fb = wizardBattleToFreeBattle(w);
  const wb = { id:'wb_x', models:[{uid:'m1'},{uid:'m2'}], discoveredLocations:[] };
  applyWizardOutcomesToWarband(wb, w, fb);
  ok(wb.discoveredLocations.includes('common:10'), 'common:10 added');

  // Pillaged: should NOT add to discoveredLocations
  const w2 = makeWizardFree();
  w2.battle.discoveries[0].result = { kind:'pillaged', lootDucats: 100 };
  const fb2 = wizardBattleToFreeBattle(w2);
  const wb2 = { id:'wb_x', models:[{uid:'m1'},{uid:'m2'}], discoveredLocations:[] };
  applyWizardOutcomesToWarband(wb2, w2, fb2);
  ok(wb2.discoveredLocations.length === 0, 'pillaged does NOT add to discoveredLocations');
});

/* ------------------------------------------------------------------ */
group('Group 9: applyWizardOutcomesToWarband — fork key uses suffix', () => {
  const w = makeWizardFree();
  w.battle.discoveries[0].result = {
    kind:'fork',
    entry:{ isFork:true, name:'Fork name', forkIndex: 2, parentRoll: 10 },
    lootDucats: 100,
  };
  const fb = wizardBattleToFreeBattle(w);
  const wb = { id:'wb_x', models:[{uid:'m1'},{uid:'m2'}], discoveredLocations:[] };
  applyWizardOutcomesToWarband(wb, w, fb);
  ok(wb.discoveredLocations.includes('common:10#2'), 'fork key = tableName:rollTotal#forkIndex');
});

/* ------------------------------------------------------------------ */
group('Group 10: applyWizardOutcomesToWarband — advancements appended', () => {
  const w = makeWizardFree();
  w.battle.participants[0].modelOutcomes[0].advancementsChosen = [
    { id:'adv-x', name:'Adv X', category:'skill' },
  ];
  const fb = wizardBattleToFreeBattle(w);
  const wb = {
    id:'wb_x',
    models:[
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2' },
    ],
    discoveredLocations:[],
  };
  applyWizardOutcomesToWarband(wb, w, fb);
  ok(wb.models[0].baseProgression.advancements.length === 1, 'm1 has 1 advancement');
  ok(wb.models[0].baseProgression.advancements[0].id === 'adv-x', 'advancement id preserved');
});

/* ------------------------------------------------------------------ */
group('Group 11: degenerate inputs do not throw', () => {
  let threw = false;
  try { wizardBattleToFreeBattle({}); } catch (e) { threw = true; }
  ok(!threw, 'empty wizard does not throw');

  threw = false;
  try { applyWizardOutcomesToWarband(null, null, null); } catch (e) { threw = true; }
  ok(!threw, 'null inputs do not throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
