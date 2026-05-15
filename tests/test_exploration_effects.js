/* Test for Fase 5.3: Apply exploration option effects
 *
 * Canon options expose effect objects of varied kinds:
 *   - add-ducats:                  trivially auto-applicable (+N 👑)
 *   - grant-xp-to-elites:          needs per-model UI (later subfase)
 *   - choose-battlekit:            needs picker filtered by keyword
 *   - add-named-battlekit:         could auto-add to Arsenal
 *   - morale-bonus next-game:      passive flag on warband
 *
 * 5.3 implements the deterministic ones (add-ducats) and surfaces the
 * rest as "pending" so the save path captures them on the FreeBattle
 * record for future resolution. The free-context save path applies
 * add-ducats by augmenting fb.loot.
 *
 * Scope:
 *   - extractExplorationEffectSummary(disc): pure summary helper
 *     returning { ducatsBonus, pending } from the chosenOption.effect.
 *   - sumExplorationDucatsBonus(W): total ducatsBonus across all
 *     discoveries in the wizard.
 *   - Integration: wizardBattleToFreeBattle includes ducatsBonus in
 *     fb.loot and stores pending effects in fb.discoveries[i].pendingEffect.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  extractExplorationEffectSummary: typeof extractExplorationEffectSummary === 'function' ? extractExplorationEffectSummary : null,
  sumExplorationDucatsBonus: typeof sumExplorationDucatsBonus === 'function' ? sumExplorationDucatsBonus : null,
  wizardBattleToFreeBattle,
  startLiveFreeBattle,
  SCENARIOS_CATALOG,
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
const { extractExplorationEffectSummary, sumExplorationDucatsBonus,
        wizardBattleToFreeBattle, startLiveFreeBattle, SCENARIOS_CATALOG } = lib;

if (!extractExplorationEffectSummary) { console.error('✗ extractExplorationEffectSummary not exported'); process.exit(1); }
if (!sumExplorationDucatsBonus) { console.error('✗ sumExplorationDucatsBonus not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: extractExplorationEffectSummary — add-ducats', () => {
  const disc = { chosenOption:{ id:'sell', effect:{ kind:'add-ducats', amount:30 } } };
  const s = extractExplorationEffectSummary(disc);
  ok(s.ducatsBonus === 30, 'add-ducats yields ducatsBonus=30');
  ok(s.pending === null || s.pending === undefined, 'add-ducats does NOT produce pending');
});

group('Group 2: extractExplorationEffectSummary — non-ducats effects → pending', () => {
  const disc = { chosenOption:{ id:'destroy', effect:{ kind:'grant-xp-to-elites', xp:1, maxModels:2 } } };
  const s = extractExplorationEffectSummary(disc);
  ok(s.ducatsBonus === 0, 'non-ducats effect has 0 ducatsBonus');
  ok(s.pending && s.pending.kind === 'grant-xp-to-elites', 'pending captures the effect kind');
  ok(s.pending.xp === 1, 'pending preserves effect data');
});

group('Group 3: extractExplorationEffectSummary — defensive inputs', () => {
  ok(extractExplorationEffectSummary(null).ducatsBonus === 0, 'null disc → 0');
  ok(extractExplorationEffectSummary({}).ducatsBonus === 0, 'empty disc → 0');
  ok(extractExplorationEffectSummary({ chosenOption:{} }).ducatsBonus === 0,
     'chosenOption without effect → 0');
  ok(extractExplorationEffectSummary({ chosenOption:{ effect:{} } }).ducatsBonus === 0,
     'effect without kind → 0');
});

/* ------------------------------------------------------------------ */
group('Group 4: sumExplorationDucatsBonus — across discoveries', () => {
  const W = { battle:{ participants:[], discoveries: [
    { warbandId:'wb_a', chosenOption:{ effect:{ kind:'add-ducats', amount:30 } } },
    { warbandId:'wb_b', chosenOption:{ effect:{ kind:'add-ducats', amount:50 } } },
    { warbandId:'wb_c', chosenOption:{ effect:{ kind:'grant-xp-to-elites' } } },  // no ducats
    { warbandId:'wb_d' /* no chosenOption */ },
  ]}};
  ok(sumExplorationDucatsBonus(W) === 80, 'sums only add-ducats effects');
});

group('Group 5: sumExplorationDucatsBonus — defensive', () => {
  ok(sumExplorationDucatsBonus(null) === 0, 'null → 0');
  ok(sumExplorationDucatsBonus({}) === 0, 'empty wizard → 0');
  ok(sumExplorationDucatsBonus({ battle:{ discoveries:[] } }) === 0, 'no discoveries → 0');
});

/* ------------------------------------------------------------------ */
group('Group 6: wizardBattleToFreeBattle — applies ducatsBonus to fb.loot', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0], dicePicked: 3 });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{
        warbandId:'wb_x',
        result:'win',
        ducatsEarned: 50,
        gloryEarned: 1,
        modelOutcomes:[],
      }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,2], rollTotal:8, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'X', options:[{id:'sell',effect:{kind:'add-ducats',amount:30}}] }, lootDucats:80 },
        chosenOptionId:'sell',
        chosenOption:{ id:'sell', effect:{ kind:'add-ducats', amount:30 } },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  ok(fb.loot === 50 + 30, `fb.loot = ducatsEarned + ducatsBonus = 80 (got ${fb.loot})`);
});

group('Group 7: wizardBattleToFreeBattle — captures pendingEffect', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0], dicePicked: 3 });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:50, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,3], rollTotal:9, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'Y' }, lootDucats:90 },
        chosenOptionId:'destroy',
        chosenOption:{ id:'destroy', effect:{ kind:'grant-xp-to-elites', xp:1, maxModels:2 } },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  ok(fb.loot === 50, 'fb.loot unchanged (non-ducats effect)');
  ok(fb.discoveries[0].pendingEffect && fb.discoveries[0].pendingEffect.kind === 'grant-xp-to-elites',
     'pendingEffect serialized on the discovery');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
