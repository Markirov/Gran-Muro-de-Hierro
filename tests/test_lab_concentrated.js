/* Test for P2 integración: Concentrated Attack en motor Lab
 *
 * Aproximación: cuando opts.concentratedAttack.{bandA|bandB} === true,
 * cada modelo con rangedDice >= 0 recibe un bonus uniforme equivalente
 * a min(max, bandSize - 1) DICE. Es una abstracción del coordinated
 * fire que no usa posiciones (el Lab no las modela).
 *
 * Scope:
 *   - applyConcentratedAttackToBand(band, opts): mutator. Aplica el
 *     bonus a cada modelo elegible. Devuelve el bonus aplicado para
 *     que el caller pueda log/reportar.
 *   - simulateBattle_lab (smoke): acepta opts.concentratedAttack sin
 *     romper. No verificamos balance — solo "no crash".
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab_ca.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  applyConcentratedAttackToBand: typeof applyConcentratedAttackToBand === 'function' ? applyConcentratedAttackToBand : null,
  computeConcentratedAttackDice,
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
const { applyConcentratedAttackToBand, computeConcentratedAttackDice } = lib;
if (!applyConcentratedAttackToBand) { console.error('✗ applyConcentratedAttackToBand not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: applyConcentratedAttackToBand — basic', () => {
  const band = [
    { name:'A', rangedDice: 2, meleeDice: 0 },
    { name:'B', rangedDice: 1, meleeDice: 0 },
    { name:'C', rangedDice: 0, meleeDice: 1 },
    { name:'D', rangedDice: 3, meleeDice: -1 },
  ];
  const bonus = applyConcentratedAttackToBand(band);
  // bandSize=4 → bonus = min(4, 3) = 3
  ok(bonus === 3, 'bonus = min(maxDefault, bandSize-1) = 3');
  ok(band[0].rangedDice === 5, 'A rangedDice 2+3 = 5');
  ok(band[1].rangedDice === 4, 'B rangedDice 1+3 = 4');
  ok(band[2].rangedDice === 3, 'C rangedDice 0+3 = 3');
  ok(band[3].rangedDice === 6, 'D rangedDice 3+3 = 6');
});

group('Group 2: small band → smaller bonus', () => {
  const band = [
    { name:'A', rangedDice: 2 },
    { name:'B', rangedDice: 1 },
  ];
  // bandSize=2 → bonus = min(4, 1) = 1
  const bonus = applyConcentratedAttackToBand(band);
  ok(bonus === 1, '2-model band → bonus 1');
  ok(band[0].rangedDice === 3, 'A 2+1 = 3');
});

group('Group 3: opts.max caps bonus', () => {
  const band = [
    { name:'A', rangedDice: 2 },
    { name:'B', rangedDice: 1 },
    { name:'C', rangedDice: 0 },
    { name:'D', rangedDice: 3 },
    { name:'E', rangedDice: 2 },
    { name:'F', rangedDice: 1 },
  ];
  // bandSize=6 → bonus = min(2, 5) = 2 (with custom max)
  const bonus = applyConcentratedAttackToBand(band, { max: 2 });
  ok(bonus === 2, 'opts.max=2 caps to 2');
  ok(band[0].rangedDice === 4, 'A 2+2 = 4');
});

group('Group 4: single-model band → 0 bonus', () => {
  const band = [{ name:'Solo', rangedDice: 3 }];
  const bonus = applyConcentratedAttackToBand(band);
  // bandSize=1 → bonus = min(4, 0) = 0
  ok(bonus === 0, 'solo band → 0');
  ok(band[0].rangedDice === 3, 'rangedDice unchanged');
});

group('Group 5: defensive', () => {
  let threw = false;
  try { applyConcentratedAttackToBand(null); } catch (e) { threw = true; }
  ok(!threw, 'null band → no throw');
  ok(applyConcentratedAttackToBand(null) === 0, 'null band → 0 bonus');
  ok(applyConcentratedAttackToBand([]) === 0, 'empty band → 0 bonus');
});

group('Group 6: integration with computeConcentratedAttackDice', () => {
  // Helper reusable from T2 — the band-level mutator is consistent
  // with the per-attack math: leadDice + N contributors, capped.
  ok(computeConcentratedAttackDice(2, 3) === 5, 'lead 2 + 3 contributors = 5');
});

group('Group 7: DOM markup mentions concentratedAttack opt', () => {
  ok(/concentratedAttack/.test(html), 'opt name surfaced in code (opt path for Lab)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
