/* Test suite for Wildcard Skills integration (canon p.109):
 *   - War Stories (11):  +1 XP to each ELITE without the skill if a
 *                        bearer exists in the warband.
 *   - Show Off (8):      +1 D6 Promotion Pool per bearer.
 *   - Glory Hound (10):  +1 ☼ per bearer on the battlefield.
 *   - War-Luck (3):      +1 Battle Scar before Unfit for Duty.
 *   - 'Tis But a Scratch (4): one re-roll of D66 Trauma per battle.
 *
 * Also exercises the underlying helpers (modelHasSkill, countWarbandSkill).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_wildcard_skills.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  modelHasSkill, countWarbandSkill,
  warStoriesBonusFor, showOffPoolBonus, gloryHoundBonus,
  unfitScarThreshold, isModelUnfitForDuty, canUseScratchReroll,
  computeModelXPGain, promotionPoolSize,
  CAMPAIGN_TABLES,
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
const {
  modelHasSkill, countWarbandSkill,
  warStoriesBonusFor, showOffPoolBonus, gloryHoundBonus,
  unfitScarThreshold, isModelUnfitForDuty, canUseScratchReroll,
  computeModelXPGain, promotionPoolSize, CAMPAIGN_TABLES,
} = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

// Test fixtures
function eliteWithSkills(uid, skillNames, extra) {
  const advancements = (skillNames || []).map(name => ({ name, source: 'roll' }));
  return {
    uid,
    baseProgression: Object.assign({
      xp: 0, advancements, scars: [], promotedToElite: true,
    }, extra || {}),
  };
}
function withTraumaScars(model, n) {
  for (let i = 0; i < n; i++) {
    model.baseProgression.scars.push({ name: 'Scar ' + (i+1), source: 'trauma' });
  }
  return model;
}

/* ------------------------------------------------------------------ */
group('Group 1: modelHasSkill / countWarbandSkill', () => {
  const m1 = eliteWithSkills('m1', ['War Stories']);
  const m2 = eliteWithSkills('m2', []);
  const m3 = eliteWithSkills('m3', ['War Stories', 'Show Off']);
  ok(modelHasSkill(m1, 'War Stories') === true, 'm1 has War Stories');
  ok(modelHasSkill(m2, 'War Stories') === false, 'm2 lacks War Stories');
  ok(modelHasSkill(m3, 'Show Off') === true, 'm3 has Show Off');
  ok(modelHasSkill(null, 'X') === false, 'null model → false');
  ok(modelHasSkill(m1, '') === false, 'empty skill → false');

  const wb = { models: [m1, m2, m3] };
  ok(countWarbandSkill(wb, 'War Stories') === 2, 'count War Stories = 2');
  ok(countWarbandSkill(wb, 'Show Off') === 1, 'count Show Off = 1');
  ok(countWarbandSkill(wb, 'Nothing') === 0, 'absent skill = 0');
});

/* ------------------------------------------------------------------ */
group('Group 2: warStoriesBonusFor — canon p.109', () => {
  const bearer = eliteWithSkills('b', ['War Stories']);
  const peer = eliteWithSkills('p', []);
  const otherPeer = eliteWithSkills('q', []);
  const wb = { models: [bearer, peer, otherPeer] };

  ok(warStoriesBonusFor(bearer, wb) === 0, 'bearer does NOT receive bonus');
  ok(warStoriesBonusFor(peer, wb) === 1, 'peer ELITE → +1');
  ok(warStoriesBonusFor(otherPeer, wb) === 1, 'other peer → +1');

  const wbNoBearer = { models: [peer, otherPeer] };
  ok(warStoriesBonusFor(peer, wbNoBearer) === 0, 'no bearer in band → 0');
});

group('Group 3: computeModelXPGain — War Stories stacks on canon math', () => {
  const bearer = eliteWithSkills('b', ['War Stories']);
  const peer = eliteWithSkills('p', []);
  const wb = { models: [bearer, peer] };
  const survived = { participated: true, outOfAction: false };
  const survivedWithDeed = { participated: true, outOfAction: false, feats: 1 };
  ok(computeModelXPGain(survived, peer, wb) === 2,
     'peer ELITE survived → +1 (survival) +1 (War Stories) = 2');
  ok(computeModelXPGain(survivedWithDeed, peer, wb) === 3,
     'peer survived + Deed + War Stories = 3');
  ok(computeModelXPGain(survived, bearer, wb) === 1,
     'bearer only gets survival, no self-bonus');
});

/* ------------------------------------------------------------------ */
group('Group 4: showOffPoolBonus + promotionPoolSize', () => {
  const wb0 = { models: [eliteWithSkills('a', [])] };
  const wb1 = { models: [eliteWithSkills('a', ['Show Off'])] };
  const wb3 = { models: [
    eliteWithSkills('a', ['Show Off']),
    eliteWithSkills('b', ['Show Off']),
    eliteWithSkills('c', ['Show Off']),
  ]};
  ok(showOffPoolBonus(wb0) === 0, 'no bearer → 0');
  ok(showOffPoolBonus(wb1) === 1, '1 bearer → 1');
  ok(showOffPoolBonus(wb3) === 3, '3 bearers → 3');

  // promotionPoolSize: base 1 + 1 per Deed + Show Off bonus.
  ok(promotionPoolSize(0, wb0) === 1, 'no deeds, no Show Off → 1 D6');
  ok(promotionPoolSize(2, wb0) === 3, '2 deeds, no Show Off → 3 D6');
  ok(promotionPoolSize(2, wb1) === 4, '2 deeds + 1 Show Off → 4 D6');
  ok(promotionPoolSize(0, wb3) === 4, '0 deeds + 3 Show Off → 4 D6');
  ok(promotionPoolSize(0) === 1, 'no wb arg → base 1 D6');
});

/* ------------------------------------------------------------------ */
group('Group 5: gloryHoundBonus — only field models count', () => {
  const m1 = eliteWithSkills('m1', ['Glory Hound']);
  const m2 = eliteWithSkills('m2', ['Glory Hound']);
  const m3 = eliteWithSkills('m3', []);
  const wb = { models: [m1, m2, m3] };

  const outcomes = [
    { modelUid: 'm1', participated: true },
    { modelUid: 'm2', participated: false }, // benched
    { modelUid: 'm3', participated: true },
  ];
  ok(gloryHoundBonus(wb, outcomes) === 1, 'only m1 on field + has skill → +1');

  const allOnField = [
    { modelUid: 'm1', participated: true },
    { modelUid: 'm2', participated: true },
    { modelUid: 'm3', participated: true },
  ];
  ok(gloryHoundBonus(wb, allOnField) === 2, 'both bearers fielded → +2');

  ok(gloryHoundBonus(null, allOnField) === 0, 'null wb → 0');
  ok(gloryHoundBonus(wb, null) === 0, 'null outcomes → 0');
});

/* ------------------------------------------------------------------ */
group('Group 6: War-Luck pushes Unfit threshold from 3 to 4', () => {
  const plain = eliteWithSkills('a', []);
  const warLuck = eliteWithSkills('b', ['War-Luck']);
  ok(unfitScarThreshold(plain) === 3, 'no War-Luck → 3 scars Unfit');
  ok(unfitScarThreshold(warLuck) === 4, 'War-Luck → 4 scars Unfit');

  withTraumaScars(plain, 3);
  withTraumaScars(warLuck, 3);
  ok(isModelUnfitForDuty(plain) === true, 'plain at 3 trauma scars → Unfit');
  ok(isModelUnfitForDuty(warLuck) === false, 'War-Luck at 3 → still fit');
  withTraumaScars(warLuck, 1);
  ok(isModelUnfitForDuty(warLuck) === true, 'War-Luck at 4 → Unfit');
});

/* ------------------------------------------------------------------ */
group('Group 7: Tis But a Scratch — one re-roll per battle', () => {
  const skilled = eliteWithSkills('a', ["'Tis But a Scratch"]);
  const plain = eliteWithSkills('b', []);
  const fresh = { participated:true, outOfAction:true, injury:{id:'leg-wound'} };
  ok(canUseScratchReroll(skilled, fresh) === true, 'skilled + fresh outcome → can reroll');
  ok(canUseScratchReroll(plain, fresh) === false, 'no skill → cannot reroll');

  const used = Object.assign({}, fresh, { scratchRerollUsed: true });
  ok(canUseScratchReroll(skilled, used) === false, 'already used → cannot reroll again');
  ok(canUseScratchReroll(null, fresh) === false, 'null model → false');
  ok(canUseScratchReroll(skilled, null) === false, 'null outcome → false');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
