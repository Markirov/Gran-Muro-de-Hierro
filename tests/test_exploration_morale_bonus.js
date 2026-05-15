/* Test for Fase 5.7: morale-bonus next-game effect
 *
 * Effects like { kind:'morale-bonus', dice:2, scope:'next-game' }
 * grant +N dice to Morale Checks in the NEXT battle only. We model
 * this as a list of temporary bonuses on the warband (wb.tempBonuses).
 *
 * Lifecycle:
 *   - At save time: decay any existing next-game bonuses (they
 *     applied to THIS battle), then push the new ones from this
 *     battle's pending effects (they will apply to the NEXT one).
 *
 * Scope:
 *   - newWarband.tempBonuses = []
 *   - migrateWarband backfills
 *   - applyWizardOutcomesToWarband:
 *     * removes existing tempBonuses with scope='next-game'
 *     * pushes new tempBonuses from morale-bonus pending effects
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_7.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, migrateWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
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
const { newWarband, migrateWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
        wizardBattleToFreeBattle, applyWizardOutcomesToWarband } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function makeWizardWithMoraleEffect() {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  return {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[1,1,2], rollTotal:4, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'Moonshine' }, lootDucats:40 },
        chosenOptionId:'distribute',
        chosenOption:{
          id:'distribute',
          effect:{ kind:'morale-bonus', dice:2, scope:'next-game' },
        },
      }],
    },
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: newWarband initializes tempBonuses', () => {
  const wb = newWarband();
  ok(Array.isArray(wb.tempBonuses), 'tempBonuses is array');
  ok(wb.tempBonuses.length === 0, 'starts empty');
});

group('Group 2: migrateWarband backfills tempBonuses', () => {
  const legacy = { id:'wb_old', name:'Old', factionId:'new-antioch', models:[] };
  migrateWarband(legacy);
  ok(Array.isArray(legacy.tempBonuses), 'tempBonuses created');
  legacy.tempBonuses.push({ kind:'morale-bonus', dice:2, scope:'next-game' });
  migrateWarband(legacy);
  ok(legacy.tempBonuses.length === 1, 'idempotent — preserves existing');
});

/* ------------------------------------------------------------------ */
group('Group 3: save adds morale-bonus to tempBonuses', () => {
  const W = makeWizardWithMoraleEffect();
  const fb = wizardBattleToFreeBattle(W);
  const wb = newWarband();
  wb.id = 'wb_x';
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.tempBonuses.length === 1, 'one bonus stored');
  const b = wb.tempBonuses[0];
  ok(b.kind === 'morale-bonus', 'kind preserved');
  ok(b.dice === 2, 'dice preserved');
  ok(b.scope === 'next-game', 'scope preserved');
  ok(typeof b.addedAt === 'string', 'addedAt set');
  ok(b.sourceBattleId === W.battle.id, 'sourceBattleId tracked');
});

group('Group 4: subsequent save decays prior next-game bonuses', () => {
  const wb = newWarband();
  wb.id = 'wb_x';
  // Seed wb with a stale next-game bonus from a prior battle.
  wb.tempBonuses.push({ kind:'morale-bonus', dice:2, scope:'next-game', sourceBattleId:'btl_prev', addedAt:'2026-01-01' });

  // New battle WITHOUT a morale-bonus effect.
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_2', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{ warbandId:'wb_x', dice:[1,1,1], rollTotal:3, tableName:'common',
        result:{ kind:'pillaged', lootDucats:30 } }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.tempBonuses.length === 0, 'prior next-game bonus decayed');
});

group('Group 5: simultaneous decay + add — new bonus survives', () => {
  const wb = newWarband();
  wb.id = 'wb_x';
  wb.tempBonuses.push({ kind:'morale-bonus', dice:1, scope:'next-game', sourceBattleId:'btl_prev', addedAt:'2026-01-01' });

  const W = makeWizardWithMoraleEffect();
  const fb = wizardBattleToFreeBattle(W);
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.tempBonuses.length === 1, 'old decayed, new added — count stays 1');
  ok(wb.tempBonuses[0].sourceBattleId === W.battle.id, 'new bonus is from current battle');
  ok(wb.tempBonuses[0].dice === 2, 'new bonus value (2) replaced old (1)');
});

group('Group 6: bonuses with other scopes are NOT decayed', () => {
  const wb = newWarband();
  wb.id = 'wb_x';
  wb.tempBonuses.push({ kind:'morale-bonus', dice:2, scope:'permanent', sourceBattleId:'btl_prev' });

  const W = makeWizardWithMoraleEffect();
  const fb = wizardBattleToFreeBattle(W);
  applyWizardOutcomesToWarband(wb, W, fb);
  // After save: permanent stays + new next-game added
  ok(wb.tempBonuses.length === 2, 'permanent scope retained alongside new next-game');
  ok(wb.tempBonuses.some(b => b.scope === 'permanent'), 'permanent still there');
  ok(wb.tempBonuses.some(b => b.scope === 'next-game'), 'new next-game added');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
