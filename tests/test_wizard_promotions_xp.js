/* Test for Fase 4.4 + canon-fidelity pass (XP wizard):
 *
 * Canon (Digital Rulebook p.103-104):
 *   - Each ELITE model that took part and survived gains +1 XP
 *     (even if Out of Action — only Dead in Trauma excludes them).
 *   - Each ELITE that performed ≥1 Glorious Deed gains +1 extra XP,
 *     capped at +1 regardless of the number of Deeds.
 *   - Troops do NOT gain XP through this mechanism (Promotion Pool).
 *   - Kills don't grant XP (no per-kill bonus exists in canon).
 *
 * The previous fixture encoded a buggy implementation (+kills stacking,
 * survival bonus only when !OoA, no ELITE gate). This file replaces it
 * with the canon-correct expectations.
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

// Helper: ELITE model fixture flagged via promotedToElite (no wb required).
function eliteModel(uid, xp) {
  return { uid, baseProgression: { xp: xp || 0, advancements: [], scars: [], promotedToElite: true } };
}
function troopModel(uid, xp) {
  return { uid, baseProgression: { xp: xp || 0, advancements: [], scars: [] } };
}

/* ------------------------------------------------------------------ */
group('Group 1: computeModelXPGain — ELITE survival baseline', () => {
  const m = eliteModel('m1');
  ok(computeModelXPGain({ participated:true, outOfAction:false }, m) === 1,
     'ELITE survived not-OoA → +1 XP');
  ok(computeModelXPGain({ participated:true, outOfAction:true }, m) === 1,
     'ELITE OoA still gains +1 (canon p.103: even if OoA)');
  ok(computeModelXPGain({ participated:false }, m) === 0,
     'did not participate → 0 XP');
});

group('Group 2: computeModelXPGain — Glorious Deed cap', () => {
  const m = eliteModel('m1');
  ok(computeModelXPGain({ participated:true, outOfAction:false, feats:1 }, m) === 2,
     '+1 survival + 1 Deed → 2');
  ok(computeModelXPGain({ participated:true, outOfAction:false, feats:3 }, m) === 2,
     '3 Deeds capped at +1 → 2');
  ok(computeModelXPGain({ participated:true, outOfAction:true, feats:2 }, m) === 2,
     'OoA + 2 Deeds → +1 survival + 1 cap = 2');
});

group('Group 3: computeModelXPGain — kills grant 0 (canon)', () => {
  const m = eliteModel('m1');
  ok(computeModelXPGain({ participated:true, outOfAction:false, kills:5 }, m) === 1,
     '5 kills, no Deed → +1 survival only');
  ok(computeModelXPGain({ participated:true, outOfAction:false, kills:5, feats:1 }, m) === 2,
     '5 kills + 1 Deed → +1 +1 cap (kills ignored)');
});

group('Group 4: computeModelXPGain — Troops gain 0', () => {
  const t = troopModel('t1');
  ok(computeModelXPGain({ participated:true, outOfAction:false, feats:1 }, t) === 0,
     'Troop with Deed → 0 (canon: Promotion Pool, not XP)');
});

group('Group 5: computeModelXPGain — Trauma gate', () => {
  const m = eliteModel('m1');
  ok(computeModelXPGain({ participated:true, outOfAction:true, injury:{id:'dead'} }, m) === 0,
     'Trauma id=dead → 0 (gated post-trauma)');
  ok(computeModelXPGain({ participated:true, outOfAction:true, injury:{id:'captured'} }, m) === 0,
     'Trauma id=captured → 0 (ransom ambiguous, default safe)');
  ok(computeModelXPGain({ participated:true, outOfAction:true, injury:{id:'leg-wound'} }, m) === 1,
     'Trauma id=leg-wound (survived) → +1');
});

group('Group 6: computeModelXPGain — Head Wound flag honoured', () => {
  const m = eliteModel('m1');
  m.baseProgression.cannotGainXp = true;
  ok(computeModelXPGain({ participated:true, outOfAction:false, feats:1 }, m) === 0,
     'cannotGainXp=true → 0 regardless of outcome');
});

/* ------------------------------------------------------------------ */
group('Group 7: getCurrentModelXP — free context reads baseProgression', () => {
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

group('Group 8: getCurrentModelXP — campaign reads warbandStates', () => {
  const wb = { id:'wb_x', models:[{ uid:'m1' }] };
  const ctx = {
    context: 'campaign',
    warbandStates: {
      wb_x: { modelStates: { m1: { xp: 9 } } },
    },
  };
  ok(getCurrentModelXP(wb, 'm1', ctx) === 9, 'campaign ctx reads warbandStates xp');
  ok(getCurrentModelXP(wb, 'unknown', ctx) === 0, 'unknown model in campaign → 0');

  const ctx2 = { context:'campaign', warbandStates: {} };
  ok(getCurrentModelXP(wb, 'm1', ctx2) === 0, 'campaign ctx without state → 0');
});

/* ------------------------------------------------------------------ */
group('Group 9: wizardHasAdvancements — threshold crossings', () => {
  ok(advancementsEarned(0) === 0, 'baseline: XP 0 → 0 advancements earned');
  ok(advancementsEarned(2) >= 1, 'XP 2 reaches at least the first threshold');

  // ELITE m1 at 1 XP. Survival = +1 → 2. Crosses first threshold.
  const wb = { id:'wb_x', models:[eliteModel('m1', 1)] };
  const wActive = {
    context: 'free',
    battle: { participants: [
      { warbandId:'wb_x', modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false }] },
    ]},
  };
  ok(wizardHasAdvancements(wActive, { getWarband: (id) => id === 'wb_x' ? wb : null }) === true,
     'XP 1 + 1 survival = 2 → crosses first threshold');

  const wIdle = {
    context: 'free',
    battle: { participants: [
      { warbandId:'wb_x', modelOutcomes:[{ modelUid:'m1', participated:false }] },
    ]},
  };
  ok(wizardHasAdvancements(wIdle, { getWarband: () => wb }) === false,
     'no XP gained → no threshold crossed');

  const wbMid = { id:'wb_x', models:[eliteModel('m1', 2)] };
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
group('Group 10: wizardHasAdvancements — degenerate inputs', () => {
  ok(wizardHasAdvancements(null, {}) === false, 'null wizard → false');
  ok(wizardHasAdvancements({}, {}) === false, 'empty wizard → false');
  ok(wizardHasAdvancements({ battle:{ participants:[] } }, {}) === false, 'no participants → false');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
