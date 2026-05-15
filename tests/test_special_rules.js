/* Test for T2/T3: Concentrated Attack + Fireteams canon rules
 *
 * Canon (TC Digital Rulebook p.70-72): two related rules surfaced
 * here as data + pure helpers. Full simulator integration belongs to
 * the Lab; this subfase delivers the canon text + a math helper.
 *
 * Scope:
 *   - CAMPAIGN_TABLES.specialRules.concentratedAttack: data entry
 *     with name, summary, conditions, mechanic.
 *   - CAMPAIGN_TABLES.specialRules.fireteams: data entry similar.
 *   - computeConcentratedAttackDice(leadDice, contributors, opts):
 *     pure helper. Returns lead + contributors capped at opts.max
 *     (default 4 additional → 5 model fireteam = lead + 4).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_t2_t3.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  CAMPAIGN_TABLES,
  computeConcentratedAttackDice: typeof computeConcentratedAttackDice === 'function' ? computeConcentratedAttackDice : null,
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
const { CAMPAIGN_TABLES, computeConcentratedAttackDice } = lib;
if (!computeConcentratedAttackDice) { console.error('✗ computeConcentratedAttackDice not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: specialRules data entries', () => {
  ok(CAMPAIGN_TABLES.specialRules, 'CAMPAIGN_TABLES.specialRules exists');
  ok(CAMPAIGN_TABLES.specialRules.concentratedAttack, 'concentratedAttack entry');
  ok(CAMPAIGN_TABLES.specialRules.fireteams, 'fireteams entry');
});

group('Group 2: concentratedAttack shape', () => {
  const ca = CAMPAIGN_TABLES.specialRules.concentratedAttack;
  ok(typeof ca.name === 'string' && ca.name.length > 0, 'name present');
  ok(typeof ca.summary === 'string' && ca.summary.length > 20, 'summary present');
  ok(typeof ca.canonPage === 'number' || typeof ca.canonPage === 'string', 'canonPage referenced');
});

group('Group 3: fireteams shape', () => {
  const ft = CAMPAIGN_TABLES.specialRules.fireteams;
  ok(typeof ft.name === 'string' && ft.name.length > 0, 'name present');
  ok(typeof ft.summary === 'string' && ft.summary.length > 20, 'summary present');
});

/* ------------------------------------------------------------------ */
group('Group 4: computeConcentratedAttackDice — basic', () => {
  ok(computeConcentratedAttackDice(3, 0) === 3, 'no contributors → lead dice');
  ok(computeConcentratedAttackDice(3, 2) === 5, '+2 contributors → lead+2');
  ok(computeConcentratedAttackDice(2, 1) === 3, '+1 contributor → lead+1');
});

group('Group 5: computeConcentratedAttackDice — cap', () => {
  // Default max additional contributors = 4 (canon: 5-model fireteam total).
  ok(computeConcentratedAttackDice(3, 4) === 7, '4 contributors at cap');
  ok(computeConcentratedAttackDice(3, 5) === 7, '5 contributors clamped to 4');
  ok(computeConcentratedAttackDice(3, 99) === 7, 'huge contributor count clamped');
  // Custom cap via opts.max
  ok(computeConcentratedAttackDice(3, 5, { max: 2 }) === 5, 'opts.max=2 → lead+2');
});

group('Group 6: computeConcentratedAttackDice — degenerate', () => {
  ok(computeConcentratedAttackDice(null, 2) === 0, 'null leadDice → 0');
  ok(computeConcentratedAttackDice(3, null) === 3, 'null contributors → lead only');
  ok(computeConcentratedAttackDice(3, -1) === 3, 'negative contributors clamped to 0');
});

group('Group 7: DOM markup mentions both rules', () => {
  ok(/Concentrated Attack|concentrated-attack|concentratedAttack/.test(html),
     'concentrated attack referenced in HTML');
  ok(/Fireteam|fireteam|firet eams|firetteams|fireteams/i.test(html),
     'fireteams referenced in HTML');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
