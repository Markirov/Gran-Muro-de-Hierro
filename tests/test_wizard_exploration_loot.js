/* Test suite: exploration Looting credited to the strongbox + no double-
 * credit when the wizard QM step already applied the income.
 *
 * Canon p.113 — Looting: each Exploration Roll yields rollTotal × 10 👑.
 * Previously this was displayed in the wizard but never folded into
 * fb.loot, so it never reached the warband's strongbox. Now:
 *   - wizardBattleToFreeBattle adds the discovery's lootDucats to fb.loot.
 *   - addFreeBattle credits fb.loot to the strongbox (default), or skips
 *     it when opts.skipStrongboxCredit is set (the QM step already
 *     credited so the player could spend during the wizard).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_expl_loot.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  wizardBattleToFreeBattle, addFreeBattle, startLiveFreeBattle, SCENARIOS_CATALOG,
  creditWizardFreeIncome, reverseWizardFreeIncome,
  newWarband, persistWarband, loadWarband,
  setWizard: (w) => { WIZARD = w; },
  getWizard: () => (typeof WIZARD !== 'undefined' ? WIZARD : null),
  getStrongbox: (id) => { const wb = loadWarband(id); return wb ? wb.strongbox : null; },
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
function alert(){}
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, appendChild(){}, querySelectorAll(){return []; }, querySelector(){return null;}, dataset:{}, innerHTML:'', textContent:'' }; }
const window = { addEventListener(){}, matchMedia(){return {matches:false,addEventListener(){}};}, requestAnimationFrame(){return 0;} };
const document = { addEventListener(){}, querySelectorAll(){return []; }, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { wizardBattleToFreeBattle, addFreeBattle, startLiveFreeBattle, SCENARIOS_CATALOG,
        creditWizardFreeIncome, reverseWizardFreeIncome, newWarband, persistWarband,
        loadWarband, setWizard, getStrongbox } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST = Object.keys(SCENARIOS_CATALOG)[0];

function makeFreeWizard(lootDucats) {
  const lfb = startLiveFreeBattle({ id:'wb_x' }, { scenarioId: FIRST });
  return {
    context:'free', lfb,
    battle:{
      id:'b1', date:'2026-06-08', scenario: lfb.scenarioId, notes:'',
      participants:[{
        warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0,
        modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false, feats:0 }],
      }],
      discoveries:[{
        warbandId:'wb_x', rollTotal: lootDucats/10, tableName:'common',
        result:{ kind:'pillaged', entry:null, lootDucats, reason:'no-entry' },
      }],
    },
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: exploration Looting folded into fb.loot', () => {
  const fb = wizardBattleToFreeBattle(makeFreeWizard(120));
  ok(fb.loot === 120, 'fb.loot includes exploration Looting (rollTotal×10 = 120)');

  // No discovery → no loot.
  const w2 = makeFreeWizard(0);
  w2.battle.discoveries = [];
  ok(wizardBattleToFreeBattle(w2).loot === 0, 'no discovery → loot 0');
});

/* ------------------------------------------------------------------ */
group('Group 2: addFreeBattle credits strongbox by default', () => {
  const wb = { id:'wb_x', models:[], freeBattles:[], strongbox:{ ducados:0, glory:0 } };
  addFreeBattle(wb, { loot:120, glory:3 });
  ok(wb.strongbox.ducados === 120, 'strongbox +120 ducats');
  ok(wb.strongbox.glory === 3, 'strongbox +3 glory');
  ok(wb.freeBattles.length === 1, 'battle appended');
});

group('Group 3: addFreeBattle skips credit when already applied', () => {
  // Simulate: QM step credited 120 already; save must not double-count.
  const wb = { id:'wb_x', models:[], freeBattles:[], strongbox:{ ducados:120, glory:3 } };
  addFreeBattle(wb, { loot:120, glory:3 }, { skipStrongboxCredit:true });
  ok(wb.strongbox.ducados === 120, 'strongbox unchanged (no double-credit)');
  ok(wb.strongbox.glory === 3, 'glory unchanged');
  ok(wb.freeBattles.length === 1, 'battle still appended');
});

/* ------------------------------------------------------------------ */
group('Group 4: creditWizardFreeIncome auto-credits the strongbox', () => {
  const wb = newWarband('iron-sultanate');
  wb.id = 'wb_qm';
  wb.models = [{ uid:'m1', baseProgression:{ xp:0, promotedToElite:true } }];
  wb.strongbox = { ducados: 0, glory: 0 };
  persistWarband(wb);

  const lfb = startLiveFreeBattle({ id:'wb_qm' }, { scenarioId: FIRST });
  setWizard({
    context:'free', lfb, incomeApplied:false,
    battle:{ id:'b', scenario: lfb.scenarioId,
      participants:[{ warbandId:'wb_qm', result:'win', ducatsEarned:0, gloryEarned:0,
        modelOutcomes:[{ modelUid:'m1', participated:true, outOfAction:false, feats:1 }] }],
      discoveries:[{ warbandId:'wb_qm', rollTotal:15, tableName:'common',
        result:{ kind:'pillaged', entry:null, lootDucats:150, reason:'no-entry' } }],
    },
  });
  const credited = creditWizardFreeIncome();
  ok(credited.ducados === 150 && credited.glory === 1, 'credited 150👑 + 1☼');
  const sb = getStrongbox('wb_qm');
  ok(sb.ducados === 150 && sb.glory === 1, 'strongbox reflects 150/1');

  // Idempotent — calling again does nothing (incomeApplied is set).
  const again = creditWizardFreeIncome();
  ok(again.ducados === 0 && again.glory === 0, 'second credit is a no-op');
  ok(getStrongbox('wb_qm').ducados === 150, 'strongbox unchanged on re-credit');
});

group('Group 5: reverseWizardFreeIncome undoes the credit on cancel', () => {
  reverseWizardFreeIncome();
  const sb = getStrongbox('wb_qm');
  ok(sb.ducados === 0 && sb.glory === 0, 'strongbox back to 0 after reverse');
  // Reversing again is a no-op (incomeApplied cleared).
  reverseWizardFreeIncome();
  ok(getStrongbox('wb_qm').ducados === 0, 'second reverse is a no-op');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
