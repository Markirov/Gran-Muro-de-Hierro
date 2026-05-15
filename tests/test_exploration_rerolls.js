/* Test for Fase 5.2: Exploration re-roll mechanics
 *
 * Canon p.113:
 *   - You may re-roll one die after the initial roll (general re-roll).
 *   - If you won the game, you may re-roll a second die (win re-roll).
 *   - Each re-roll is one-shot per battle.
 *
 * The Fase 1 engine rollExplorationDice already accepts opts
 * { won, useReroll, useWinReroll }, so the wiring is helpers + UI.
 *
 * Scope:
 *   - wizardWonForWarband(W, warbandId): true if that participant's
 *     result === 'win'. Drives win-reroll availability.
 *   - wizardRerollStatus(disc): { generalAvailable, winAvailable }
 *     reading disc.rerollUsed / disc.rerollWinUsed.
 *   - applyWizardExplorationReroll(W, ctx, kind): re-rolls the
 *     existing discovery for the given warband. kind='general'|'win'.
 *     Mutates discovery record, idempotent if the slot is already
 *     used (no-op).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fase5_2.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  wizardWonForWarband: typeof wizardWonForWarband === 'function' ? wizardWonForWarband : null,
  wizardRerollStatus: typeof wizardRerollStatus === 'function' ? wizardRerollStatus : null,
  applyWizardExplorationReroll: typeof applyWizardExplorationReroll === 'function' ? applyWizardExplorationReroll : null,
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
const { wizardWonForWarband, wizardRerollStatus, applyWizardExplorationReroll } = lib;

if (!wizardWonForWarband) { console.error('✗ wizardWonForWarband not exported'); process.exit(1); }
if (!wizardRerollStatus) { console.error('✗ wizardRerollStatus not exported'); process.exit(1); }
if (!applyWizardExplorationReroll) { console.error('✗ applyWizardExplorationReroll not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: wizardWonForWarband', () => {
  const W = { battle: { participants: [
    { warbandId:'wb_a', result:'win' },
    { warbandId:'wb_b', result:'loss' },
    { warbandId:'wb_c', result:'draw' },
  ]}};
  ok(wizardWonForWarband(W, 'wb_a') === true, 'win → true');
  ok(wizardWonForWarband(W, 'wb_b') === false, 'loss → false');
  ok(wizardWonForWarband(W, 'wb_c') === false, 'draw → false');
  ok(wizardWonForWarband(W, 'unknown') === false, 'unknown wbId → false');
  ok(wizardWonForWarband(null, 'wb_a') === false, 'null wizard → false');
});

/* ------------------------------------------------------------------ */
group('Group 2: wizardRerollStatus — both available initially', () => {
  const disc = { rerollUsed:false, rerollWinUsed:false };
  const s = wizardRerollStatus(disc);
  ok(s.generalAvailable === true, 'general available');
  ok(s.winAvailable === true, 'win available');
});

group('Group 3: wizardRerollStatus — flags consumed', () => {
  const s1 = wizardRerollStatus({ rerollUsed:true, rerollWinUsed:false });
  ok(s1.generalAvailable === false, 'general consumed');
  ok(s1.winAvailable === true, 'win still available');

  const s2 = wizardRerollStatus({ rerollUsed:false, rerollWinUsed:true });
  ok(s2.generalAvailable === true, 'general still available');
  ok(s2.winAvailable === false, 'win consumed');

  const s3 = wizardRerollStatus({ rerollUsed:true, rerollWinUsed:true });
  ok(s3.generalAvailable === false && s3.winAvailable === false, 'both consumed');
});

group('Group 4: wizardRerollStatus — defensive', () => {
  ok(wizardRerollStatus(null).generalAvailable === false, 'null disc → general false');
  ok(wizardRerollStatus(null).winAvailable === false, 'null disc → win false');
  // Missing flags default to "available" (treat absence as unused)
  ok(wizardRerollStatus({}).generalAvailable === true, 'empty disc → general true (unused)');
});

/* ------------------------------------------------------------------ */
group('Group 5: applyWizardExplorationReroll — general re-roll consumes slot', () => {
  const ctx = { warbandId:'wb_x', dice: 3, tableName:'common', alreadyDiscovered:[] };
  // Pre-existing roll (no re-rolls used)
  const disc = {
    warbandId:'wb_x',
    dice:[1,1,1], rollTotal:3,
    rerollUsed:false, rerollWinUsed:false,
    result:{ kind:'pillaged', lootDucats:30, reason:'no-entry' },
  };
  const W = { battle:{ participants:[{ warbandId:'wb_x', result:'loss' }], discoveries:[disc] } };
  applyWizardExplorationReroll(W, ctx, 'general');
  ok(disc.rerollUsed === true, 'general slot consumed');
  // Dice array length stays the same (we re-rolled inside, not appended)
  ok(disc.dice.length === 3, 'dice array length preserved');
});

group('Group 6: applyWizardExplorationReroll — win re-roll requires win', () => {
  const ctx = { warbandId:'wb_x', dice: 3, tableName:'common', alreadyDiscovered:[] };
  const disc = {
    warbandId:'wb_x',
    dice:[2,2,2], rollTotal:6,
    rerollUsed:false, rerollWinUsed:false,
    result:{ kind:'pillaged', lootDucats:60 },
  };
  // Participant lost → win re-roll should be a no-op
  let W = { battle:{ participants:[{ warbandId:'wb_x', result:'loss' }], discoveries:[disc] } };
  applyWizardExplorationReroll(W, ctx, 'win');
  ok(disc.rerollWinUsed === false, 'win re-roll noop when not a win');

  // Participant won → win re-roll consumes slot
  W = { battle:{ participants:[{ warbandId:'wb_x', result:'win' }], discoveries:[disc] } };
  applyWizardExplorationReroll(W, ctx, 'win');
  ok(disc.rerollWinUsed === true, 'win re-roll consumes slot after win');
});

group('Group 7: applyWizardExplorationReroll — idempotent on consumed slot', () => {
  const ctx = { warbandId:'wb_x', dice: 2, tableName:'common', alreadyDiscovered:[] };
  const disc = {
    warbandId:'wb_x',
    dice:[1,1], rollTotal:2,
    rerollUsed:true, rerollWinUsed:false,
    result:{ kind:'pillaged', lootDucats:20 },
  };
  const W = { battle:{ participants:[{ warbandId:'wb_x', result:'win' }], discoveries:[disc] } };
  const beforeTotal = disc.rollTotal;
  applyWizardExplorationReroll(W, ctx, 'general');
  ok(disc.rollTotal === beforeTotal, 'general re-roll noop when already used');
});

group('Group 8: applyWizardExplorationReroll — defensive', () => {
  let threw = false;
  try { applyWizardExplorationReroll(null, null, 'general'); } catch (e) { threw = true; }
  ok(!threw, 'null inputs do not throw');

  threw = false;
  try { applyWizardExplorationReroll({}, {}, 'unknown-kind'); } catch (e) { threw = true; }
  ok(!threw, 'unknown kind does not throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
