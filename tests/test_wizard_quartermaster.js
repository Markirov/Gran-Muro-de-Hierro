/* Test for Fase 4.6: Quartermaster step — loot summary + per-context wiring
 *
 * Scope:
 *   - summarizeWizardLoot(W): pure function. Returns per-warband totals
 *     { warbandId, ducatsEarned, gloryEarned, lootDucats, totalDucats }
 *     by combining battle.participants[i].ducatsEarned/gloryEarned
 *     (from Resultados) with battle.discoveries[i].result.lootDucats
 *     (from Exploration).
 *   - WIZARD.context branches: campaign exposes "Open QM" affordance
 *     wired to openQuartermaster; free shows a deferral notice (full
 *     application of earnings happens at save time in Fase 4.7).
 *
 * Out of scope for 4.6: actually purchasing/selling inside the wizard
 * (that's the existing QM modal's job, just invoked from the step),
 * free-context strongbox application (Fase 4.7), shopping list (Fase 6).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase4_6.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startWizard, closeWizard, startLiveFreeBattle,
  summarizeWizardLoot: typeof summarizeWizardLoot === 'function' ? summarizeWizardLoot : null,
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
const { summarizeWizardLoot, startWizard, closeWizard, startLiveFreeBattle,
        SCENARIOS_CATALOG, getWizard, setCampaign } = lib;

if (!summarizeWizardLoot) { console.error('✗ summarizeWizardLoot not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: summarizeWizardLoot — empty/degenerate inputs', () => {
  ok(Array.isArray(summarizeWizardLoot(null)), 'null wizard → array');
  ok(summarizeWizardLoot(null).length === 0, 'null wizard → empty array');
  ok(summarizeWizardLoot({}).length === 0, 'empty wizard → empty array');
  ok(summarizeWizardLoot({ battle:{ participants:[] } }).length === 0,
     'no participants → empty array');
});

/* ------------------------------------------------------------------ */
group('Group 2: summarizeWizardLoot — single participant', () => {
  const W = {
    battle: {
      participants: [{ warbandId:'wb_x', ducatsEarned: 50, gloryEarned: 1 }],
      discoveries: [{ warbandId:'wb_x', result:{ lootDucats: 30 } }],
    },
  };
  const summary = summarizeWizardLoot(W);
  ok(summary.length === 1, 'one participant → one row');
  ok(summary[0].warbandId === 'wb_x', 'warbandId preserved');
  ok(summary[0].ducatsEarned === 50, 'ducats from Resultados');
  ok(summary[0].gloryEarned === 1, 'glory from Resultados');
  ok(summary[0].lootDucats === 30, 'lootDucats from Exploration');
  ok(summary[0].totalDucats === 80, 'totalDucats = ducatsEarned + lootDucats');
});

/* ------------------------------------------------------------------ */
group('Group 3: summarizeWizardLoot — multi participant', () => {
  const W = {
    battle: {
      participants: [
        { warbandId:'wb_a', ducatsEarned: 50, gloryEarned: 1 },
        { warbandId:'wb_b', ducatsEarned: 20, gloryEarned: 0 },
      ],
      discoveries: [
        { warbandId:'wb_a', result:{ lootDucats: 30 } },
        { warbandId:'wb_b', result:{ lootDucats: 40 } },
      ],
    },
  };
  const summary = summarizeWizardLoot(W);
  ok(summary.length === 2, 'two participants → two rows');
  const a = summary.find(s => s.warbandId === 'wb_a');
  const b = summary.find(s => s.warbandId === 'wb_b');
  ok(a.totalDucats === 80, 'wb_a totalDucats = 80');
  ok(b.totalDucats === 60, 'wb_b totalDucats = 60');
});

/* ------------------------------------------------------------------ */
group('Group 4: summarizeWizardLoot — missing fields default to 0', () => {
  const W = {
    battle: {
      participants: [{ warbandId:'wb_x' }],  // no ducatsEarned, no gloryEarned
      discoveries: [],                        // no exploration roll yet
    },
  };
  const s = summarizeWizardLoot(W);
  ok(s[0].ducatsEarned === 0, 'missing ducatsEarned → 0');
  ok(s[0].gloryEarned === 0, 'missing gloryEarned → 0');
  ok(s[0].lootDucats === 0, 'no discovery for warband → 0 lootDucats');
  ok(s[0].totalDucats === 0, 'totalDucats = 0');
});

/* ------------------------------------------------------------------ */
group('Group 5: summarizeWizardLoot — pillaged still yields lootDucats', () => {
  const W = {
    battle: {
      participants: [{ warbandId:'wb_x', ducatsEarned: 50, gloryEarned: 0 }],
      discoveries: [{ warbandId:'wb_x', result:{ kind:'pillaged', lootDucats: 25, reason:'no-entry' } }],
    },
  };
  const s = summarizeWizardLoot(W);
  // Canon: even pillaged rolls grant loot equal to total × 10. We must
  // still surface it.
  ok(s[0].lootDucats === 25, 'pillaged result still contributes lootDucats');
  ok(s[0].totalDucats === 75, 'totalDucats = 50 + 25');
});

/* ------------------------------------------------------------------ */
group('Group 6: integration with live WIZARD (free context)', () => {
  setCampaign({ id:'cmp_t', name:'T', warbandIds:['wb_x'], battles:[], warbandStates:{},
    rewardDefaults:{win:{ducados:50,glory:1},draw:{ducados:30,glory:0},loss:{ducados:20,glory:0}} });
  const lfb = startLiveFreeBattle({id:'wb_x'}, { scenarioId: Object.keys(SCENARIOS_CATALOG)[0] });
  startWizard({ context:'free', lfb });
  const w = getWizard();
  // Inject earnings + a discovery directly (skipping the UI flow).
  w.battle.participants[0].ducatsEarned = 30;
  w.battle.participants[0].gloryEarned = 0;
  w.battle.discoveries.push({ warbandId:'wb_x', result:{ kind:'discovery', lootDucats: 60, entry:{ name:'Moonshine' } } });
  const summary = summarizeWizardLoot(w);
  ok(summary.length === 1, 'free wizard has one summary row');
  ok(summary[0].totalDucats === 90, '30 ducats + 60 loot = 90');
  closeWizard();
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
