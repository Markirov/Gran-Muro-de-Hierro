/* Test for P2 reglas no modeladas: Goetic Spells, Eye of Beelzebub, Fortify ACTION
 *
 * Tres entradas nuevas en CAMPAIGN_TABLES.specialRules paráfrasis
 * canon. Misma forma que concentratedAttack/fireteams (T2/T3).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_p2_rules.js');
const moduleCode = js.slice(0, bootIdx) + `module.exports = { CAMPAIGN_TABLES };`;
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
const { CAMPAIGN_TABLES } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const REQUIRED = ['goeticSpells', 'eyeOfBeelzebub', 'fortifyAction'];

group('Group 1: required rule entries present', () => {
  ok(CAMPAIGN_TABLES.specialRules, 'specialRules object exists');
  for (const id of REQUIRED) {
    ok(!!CAMPAIGN_TABLES.specialRules[id], `${id} entry present`);
  }
});

group('Group 2: shape canon', () => {
  for (const id of REQUIRED) {
    const r = CAMPAIGN_TABLES.specialRules[id];
    if (!r) continue;
    ok(typeof r.name === 'string' && r.name.length > 0, `${id}: name`);
    ok(typeof r.summary === 'string' && r.summary.length > 20, `${id}: summary`);
    ok(typeof r.canonPage === 'string' || typeof r.canonPage === 'number', `${id}: canonPage`);
  }
});

group('Group 3: Goetic Spells lista hechizos', () => {
  const g = CAMPAIGN_TABLES.specialRules.goeticSpells;
  if (!g) { ok(false, 'goeticSpells missing'); }
  else {
    ok(Array.isArray(g.spells), 'spells array present');
    ok(g.spells.length > 0, 'has at least one spell');
    ok(g.spells.every(s => s.name && s.summary), 'spells have name+summary');
  }
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
