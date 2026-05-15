/* Test for T4: Missing canon scenarios (V, VI, IX)
 *
 * BACKLOG P2 escenarios faltantes. Tres entradas nuevas en
 * SCENARIOS_CATALOG: armoured-train (V), dragon-hunt (VI),
 * fields-of-glory (IX). Misma forma que las existentes.
 *
 * Scope:
 *   - SCENARIOS_CATALOG contiene los tres ids.
 *   - Cada uno tiene { name, summary, numTurns, archetype, vpHints, deeds }.
 *   - Suma total de escenarios > 10 tras esta subfase (estaban 10).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_t4.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = { SCENARIOS_CATALOG };
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
const { SCENARIOS_CATALOG } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const REQUIRED = ['armoured-train', 'dragon-hunt', 'fields-of-glory'];

group('Group 1: catalog count increased', () => {
  const keys = Object.keys(SCENARIOS_CATALOG);
  ok(keys.length >= 13, `catalog has at least 13 scenarios (got ${keys.length})`);
});

group('Group 2: required scenarios present', () => {
  for (const id of REQUIRED) {
    ok(!!SCENARIOS_CATALOG[id], `${id} present`);
  }
});

group('Group 3: each new scenario has canon shape', () => {
  for (const id of REQUIRED) {
    const s = SCENARIOS_CATALOG[id];
    if (!s) { ok(false, `${id} skipped (missing)`); continue; }
    ok(typeof s.name === 'string' && s.name.length > 0, `${id}: name`);
    ok(typeof s.summary === 'string' && s.summary.length > 10, `${id}: summary`);
    ok(typeof s.numTurns === 'number' && s.numTurns > 0, `${id}: numTurns`);
    ok(typeof s.archetype === 'string', `${id}: archetype`);
    ok(typeof s.vpHints === 'string', `${id}: vpHints`);
    ok(Array.isArray(s.deeds) && s.deeds.length > 0, `${id}: deeds[]`);
    ok(s.deeds.every(d => d.name && d.desc), `${id}: deeds have name+desc`);
  }
});

group('Group 4: names follow canon numbering convention', () => {
  ok(/^V[ —]/.test(SCENARIOS_CATALOG['armoured-train'].name), 'V — prefix');
  ok(/^VI[ —]/.test(SCENARIOS_CATALOG['dragon-hunt'].name), 'VI — prefix');
  ok(/^IX[ —]/.test(SCENARIOS_CATALOG['fields-of-glory'].name), 'IX — prefix');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
