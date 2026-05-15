/* Test for Fase 5.5: Resolve grant-xp-to-elites pending effect
 *
 * Canon options like Moonshine Stash → Destroy carry:
 *   effect: { kind: 'grant-xp-to-elites', xp: 1, maxModels: 2, advancementCheck: true }
 *
 * Up to maxModels ELITE models in the warband receive +xp each. The
 * picker is interactive (player decides who); the application happens
 * at save time alongside other XP adjustments.
 *
 * Scope:
 *   - getEliteModels(wb): pure list of models flagged as ELITE either
 *     via canon unit keywords or companion keywords.
 *   - resolveGrantXpToEliteTargets(disc, modelUids): mutator. Caps the
 *     selection at the effect's maxModels and stores on
 *     disc.chosenOption.resolvedTargets.
 *   - applyWizardOutcomesToWarband honours resolvedTargets at save:
 *     adds effect.xp to baseProgression.xp for each target.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_5.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  newWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
  getEliteModels: typeof getEliteModels === 'function' ? getEliteModels : null,
  resolveGrantXpToEliteTargets: typeof resolveGrantXpToEliteTargets === 'function' ? resolveGrantXpToEliteTargets : null,
  wizardBattleToFreeBattle,
  applyWizardOutcomesToWarband,
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
const { newWarband, startLiveFreeBattle, SCENARIOS_CATALOG,
        getEliteModels, resolveGrantXpToEliteTargets,
        wizardBattleToFreeBattle, applyWizardOutcomesToWarband } = lib;

if (!getEliteModels) { console.error('✗ getEliteModels not exported'); process.exit(1); }
if (!resolveGrantXpToEliteTargets) { console.error('✗ resolveGrantXpToEliteTargets not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: getEliteModels — canon unit keyword path', () => {
  const wb = {
    id:'wb_x', factionId:'new-antioch',
    models: [
      { uid:'m1', unitId:'a' },
      { uid:'m2', unitId:'b' },
    ],
  };
  // No real keyword lookup here — the helper should at least not throw and
  // return an array (empty when no real units resolve).
  const r = getEliteModels(wb);
  ok(Array.isArray(r), 'returns array even with unresolved units');
});

group('Group 2: getEliteModels — companion keyword path', () => {
  const wb = {
    id:'wb_x', factionId:'new-antioch',
    models: [
      { uid:'m1', companionRef:true, companionKeywords:[{name:'ELITE'},{name:'LEADER'}] },
      { uid:'m2', companionRef:true, companionKeywords:[{name:'TROOP'}] },
      { uid:'m3', companionRef:true, companionKeywords:[] },
    ],
  };
  const r = getEliteModels(wb);
  ok(r.length === 1, 'only m1 (ELITE companion keyword) picked');
  ok(r[0].uid === 'm1', 'picked the right model');
});

group('Group 3: getEliteModels — companion keywords as strings', () => {
  // Some companion exports use string keywords instead of {name:...}
  const wb = {
    id:'wb_x', factionId:'new-antioch',
    models: [
      { uid:'m1', companionRef:true, companionKeywords:['ELITE','LEADER'] },
      { uid:'m2', companionRef:true, companionKeywords:['troop'] },
    ],
  };
  const r = getEliteModels(wb);
  ok(r.length === 1, 'string-keyword form supported');
  ok(r[0].uid === 'm1', 'm1 picked');
});

group('Group 4: getEliteModels — defensive', () => {
  ok(getEliteModels(null).length === 0, 'null wb → empty');
  ok(getEliteModels({}).length === 0, 'empty wb → empty');
  ok(getEliteModels({models:[]}).length === 0, 'no models → empty');
});

/* ------------------------------------------------------------------ */
group('Group 5: resolveGrantXpToEliteTargets — caps at maxModels', () => {
  const disc = {
    chosenOption: { effect: { kind:'grant-xp-to-elites', xp:1, maxModels:2 } },
  };
  resolveGrantXpToEliteTargets(disc, ['a','b','c']);
  ok(Array.isArray(disc.chosenOption.resolvedTargets), 'resolvedTargets array set');
  ok(disc.chosenOption.resolvedTargets.length === 2, 'capped at maxModels=2');
  ok(disc.chosenOption.resolvedTargets[0] === 'a' && disc.chosenOption.resolvedTargets[1] === 'b',
     'first two preserved (priority by selection order)');
});

group('Group 6: resolveGrantXpToEliteTargets — overwrites prior pick', () => {
  const disc = {
    chosenOption: { effect: { kind:'grant-xp-to-elites', xp:1, maxModels:2 }, resolvedTargets:['x'] },
  };
  resolveGrantXpToEliteTargets(disc, ['y','z']);
  ok(disc.chosenOption.resolvedTargets.join(',') === 'y,z', 'overwrites prior selection');
});

group('Group 7: resolveGrantXpToEliteTargets — defensive', () => {
  let threw = false;
  try { resolveGrantXpToEliteTargets(null, ['a']); } catch (e) { threw = true; }
  ok(!threw, 'null disc does not throw');

  threw = false;
  try { resolveGrantXpToEliteTargets({}, ['a']); } catch (e) { threw = true; }
  ok(!threw, 'disc without chosenOption does not throw');

  // Wrong effect kind: no-op
  const disc = { chosenOption: { effect: { kind:'add-ducats', amount:30 } } };
  resolveGrantXpToEliteTargets(disc, ['a']);
  ok(!('resolvedTargets' in disc.chosenOption), 'wrong-kind effect leaves no resolvedTargets');
});

/* ------------------------------------------------------------------ */
group('Group 8: applyWizardOutcomesToWarband honours resolvedTargets', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,2], rollTotal:8, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'X' }, lootDucats:80 },
        chosenOptionId:'destroy',
        chosenOption:{
          id:'destroy',
          effect:{ kind:'grant-xp-to-elites', xp:1, maxModels:2, advancementCheck:true },
          resolvedTargets:['m1','m2'],
        },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = {
    id:'wb_x',
    models:[
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2', baseProgression:{ xp:2, advancements:[], scars:[] } },
      { uid:'m3', baseProgression:{ xp:5, advancements:[], scars:[] } },
    ],
    discoveredLocations:[],
  };
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.models[0].baseProgression.xp === 2, 'm1 +1 XP applied');
  ok(wb.models[1].baseProgression.xp === 3, 'm2 +1 XP applied');
  ok(wb.models[2].baseProgression.xp === 5, 'm3 untouched (not targeted)');
});

/* ------------------------------------------------------------------ */
group('Group 9: unresolved grant-xp-to-elites does NOT apply XP', () => {
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  const W = {
    context:'free', lfb,
    battle:{
      id:'btl_1', date:'2026-05-11', scenario: lfb.scenarioId, notes:'',
      participants:[{ warbandId:'wb_x', result:'win', ducatsEarned:0, gloryEarned:0, modelOutcomes:[] }],
      discoveries:[{
        warbandId:'wb_x', dice:[3,3,2], rollTotal:8, tableName:'common',
        result:{ kind:'discovery', entry:{ name:'X' }, lootDucats:80 },
        chosenOptionId:'destroy',
        chosenOption:{ id:'destroy', effect:{ kind:'grant-xp-to-elites', xp:1, maxModels:2 } /* no resolvedTargets */ },
      }],
    },
  };
  const fb = wizardBattleToFreeBattle(W);
  const wb = {
    id:'wb_x',
    models:[
      { uid:'m1', baseProgression:{ xp:1, advancements:[], scars:[] } },
      { uid:'m2', baseProgression:{ xp:2, advancements:[], scars:[] } },
    ],
    discoveredLocations:[],
  };
  applyWizardOutcomesToWarband(wb, W, fb);
  ok(wb.models[0].baseProgression.xp === 1, 'm1 unchanged when not resolved');
  ok(wb.models[1].baseProgression.xp === 2, 'm2 unchanged when not resolved');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
