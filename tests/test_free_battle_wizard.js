/* Test for Fase 3: Wizard de partida libre
 *
 * Pure-logic coverage (module-style) for:
 *   - startLiveFreeBattle(wb, opts) factory
 *   - SCENARIOS_CATALOG presence
 *   - LIVE_FREE_BATTLE in-memory state (set/get/clear)
 *
 * UI integration (modal markup, button wire) is checked via a minimal
 * jsdom block at the bottom — we don't drive the full bootstrap, just
 * assert the static DOM is in place.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

/* ------------------------------------------------------------------ */
/* Extract the inline <script> and cut at boot() to skip DOM bootstrap */
/* ------------------------------------------------------------------ */
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Could not locate inline <script> block');
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
if (bootIdx < 0) throw new Error('Could not locate boot() function');

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  startLiveFreeBattle: typeof startLiveFreeBattle === 'function' ? startLiveFreeBattle : null,
  setLiveFreeBattle: typeof setLiveFreeBattle === 'function' ? setLiveFreeBattle : null,
  getLiveFreeBattle: typeof getLiveFreeBattle === 'function' ? getLiveFreeBattle : null,
  clearLiveFreeBattle: typeof clearLiveFreeBattle === 'function' ? clearLiveFreeBattle : null,
  SCENARIOS_CATALOG: typeof SCENARIOS_CATALOG !== 'undefined' ? SCENARIOS_CATALOG : null,
  createFreeBattle: typeof createFreeBattle === 'function' ? createFreeBattle : null,
};
`;
// localStorage mock so persistWarband etc. doesn't blow up at parse time
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

let lib;
try {
  lib = require(TMP);
} catch (e) {
  console.error('Failed to load module:', e.message);
  process.exit(1);
}

const {
  startLiveFreeBattle,
  setLiveFreeBattle,
  getLiveFreeBattle,
  clearLiveFreeBattle,
  SCENARIOS_CATALOG,
} = lib;

if (!startLiveFreeBattle) { console.error('✗ startLiveFreeBattle not exported'); process.exit(1); }
if (!setLiveFreeBattle || !getLiveFreeBattle || !clearLiveFreeBattle) {
  console.error('✗ LIVE_FREE_BATTLE state helpers not exported'); process.exit(1);
}
if (!SCENARIOS_CATALOG) { console.error('✗ SCENARIOS_CATALOG not in scope'); process.exit(1); }

/* ------------------------------------------------------------------ */
/* Helper: assert                                                     */
/* ------------------------------------------------------------------ */
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); pass++; }
  else      { console.log('  ✗ ' + msg); fail++; }
}
function group(name, fn) { console.log('\n' + name); fn(); }

const FIRST_SCENARIO = Object.keys(SCENARIOS_CATALOG)[0];
const sampleWb = { id: 'wb_abc123', name: 'Test Band', factionId: 'new-antioch' };

/* ------------------------------------------------------------------ */
/* Group 1: Shape & defaults                                          */
/* ------------------------------------------------------------------ */
group('Group 1: shape & defaults', () => {
  const lfb = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO });
  ok(typeof lfb === 'object' && lfb !== null, 'returns an object');
  ok(typeof lfb.id === 'string' && lfb.id.startsWith('fb_'), 'id starts with fb_');
  ok(lfb.warbandId === 'wb_abc123', 'warbandId taken from wb.id');
  ok(lfb.scenarioId === FIRST_SCENARIO, 'scenarioId preserved');
  ok(lfb.dicePicked === 3, 'default dicePicked is 3');
  ok(lfb.status === 'in-progress', 'status is in-progress');
  ok(typeof lfb.startedAt === 'string' && lfb.startedAt.length > 10, 'startedAt is ISO timestamp');
  ok(typeof lfb.opponent === 'string', 'opponent is a string (empty default)');
  ok(typeof lfb.name === 'string' && lfb.name.length > 0, 'name is non-empty');
});

/* ------------------------------------------------------------------ */
/* Group 2: Scenario validation                                       */
/* ------------------------------------------------------------------ */
group('Group 2: scenario validation', () => {
  let threw = false;
  try { startLiveFreeBattle(sampleWb, {}); } catch (e) { threw = true; }
  ok(threw, 'throws when scenarioId missing');

  threw = false;
  try { startLiveFreeBattle(sampleWb, { scenarioId: 'not-a-real-scenario' }); } catch (e) { threw = true; }
  ok(threw, 'throws when scenarioId not in catalog');

  threw = false;
  try { startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO }); } catch (e) { threw = true; }
  ok(!threw, 'accepts valid scenarioId');
});

/* ------------------------------------------------------------------ */
/* Group 3: Dice clamping                                             */
/* ------------------------------------------------------------------ */
group('Group 3: dice clamping (1-10)', () => {
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 0  }).dicePicked === 1,  '0 clamps to 1');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: -5 }).dicePicked === 1,  '-5 clamps to 1');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 11 }).dicePicked === 10, '11 clamps to 10');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 100}).dicePicked === 10, '100 clamps to 10');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 1  }).dicePicked === 1,  '1 stays 1');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 10 }).dicePicked === 10, '10 stays 10');
  ok(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, dicePicked: 5.7}).dicePicked === 5,  '5.7 floors to 5');
});

/* ------------------------------------------------------------------ */
/* Group 4: Auto-generated name                                       */
/* ------------------------------------------------------------------ */
group('Group 4: auto-generated name', () => {
  const a = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO });
  ok(a.name.startsWith('Libre · '), 'no name + no opponent: starts with "Libre · "');

  const b = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, opponent: 'Heretic Legions' });
  ok(b.name.includes('vs Heretic Legions'), 'no name + opponent: includes "vs <opponent>"');

  const c = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, name: 'Mi batalla épica' });
  ok(c.name === 'Mi batalla épica', 'provided name preserved verbatim');

  const d = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, name: '   ' });
  ok(d.name.startsWith('Libre · '), 'whitespace-only name treated as missing');

  const e = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO, name: '', opponent: 'Trench Pilgrims' });
  ok(e.name.includes('vs Trench Pilgrims'), 'empty name + opponent: auto-gen with opponent');
});

/* ------------------------------------------------------------------ */
/* Group 5: Warband linkage                                           */
/* ------------------------------------------------------------------ */
group('Group 5: warband linkage', () => {
  const a = startLiveFreeBattle(null, { scenarioId: FIRST_SCENARIO });
  ok(a.warbandId === null, 'null wb yields warbandId=null');

  const b = startLiveFreeBattle({ id: 'wb_xyz' }, { scenarioId: FIRST_SCENARIO });
  ok(b.warbandId === 'wb_xyz', 'wb.id is captured');

  const c = startLiveFreeBattle({}, { scenarioId: FIRST_SCENARIO });
  ok(c.warbandId === null, 'wb without id yields warbandId=null');
});

/* ------------------------------------------------------------------ */
/* Group 6: In-memory LIVE_FREE_BATTLE state                          */
/* ------------------------------------------------------------------ */
group('Group 6: in-memory LIVE_FREE_BATTLE state', () => {
  clearLiveFreeBattle();
  ok(getLiveFreeBattle() === null, 'clear yields null');

  const lfb = startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO });
  setLiveFreeBattle(lfb);
  ok(getLiveFreeBattle() === lfb, 'set then get returns same reference');
  ok(getLiveFreeBattle().id === lfb.id, 'id matches');

  clearLiveFreeBattle();
  ok(getLiveFreeBattle() === null, 'clear after set yields null again');
});

/* ------------------------------------------------------------------ */
/* Group 7: Scenarios catalog                                         */
/* ------------------------------------------------------------------ */
group('Group 7: scenarios catalog', () => {
  const keys = Object.keys(SCENARIOS_CATALOG);
  ok(keys.length >= 8, `catalog has at least 8 scenarios (got ${keys.length})`);
  ok(keys.every(k => SCENARIOS_CATALOG[k] && typeof SCENARIOS_CATALOG[k].name === 'string'),
     'every scenario has a name field');
});

/* ------------------------------------------------------------------ */
/* Group 8: ID uniqueness                                             */
/* ------------------------------------------------------------------ */
group('Group 8: id uniqueness', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    ids.add(startLiveFreeBattle(sampleWb, { scenarioId: FIRST_SCENARIO }).id);
  }
  ok(ids.size === 100, `100 calls yield 100 distinct ids (got ${ids.size})`);
});

/* ------------------------------------------------------------------ */
/* Group 9: DOM static markup (jsdom-lite — just check strings exist) */
/* ------------------------------------------------------------------ */
group('Group 9: DOM markup present in HTML', () => {
  ok(html.includes('id="btn-start-free-battle"'), 'btn-start-free-battle button exists in HTML');
  ok(html.includes('id="modal-free-battle-wizard"'), 'modal-free-battle-wizard exists in HTML');
  ok(html.includes('id="fbw-name"'), 'wizard has name input');
  ok(html.includes('id="fbw-opponent"'), 'wizard has opponent input');
  ok(html.includes('id="fbw-scenario"'), 'wizard has scenario selector');
  ok(html.includes('id="fbw-dice"'), 'wizard has dice slider');
  ok(html.includes('id="btn-fbw-confirm"'), 'wizard has confirm button');
});

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
