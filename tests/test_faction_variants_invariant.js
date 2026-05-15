/* Test invariante: variantes canon BACKLOG presentes en DATA
 *
 * Las 3 factions citadas en BACKLOG ya tienen sus variantes como
 * stubs. Test fija invariante: si alguien borra una accidentalmente
 * o se renombra, el test falla.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_variants_inv.js');
const moduleCode = js.slice(0, bootIdx) + `module.exports = { DATA };`;
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
const { DATA } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function findVariant(factionId, variantId) {
  const f = DATA.factions[factionId];
  if (!f || !Array.isArray(f.variants)) return null;
  return f.variants.find(v => v.id === variantId);
}

/* ------------------------------------------------------------------ */
group('Group 1: Court of the Seven-Headed Serpent — 7 Sins variants', () => {
  const f = DATA.factions['court-serpent'];
  ok(!!f, 'court-serpent faction present');
  ok(Array.isArray(f.variants) && f.variants.length >= 7, 'at least 7 variants');
  for (const sin of ['wrath', 'envy', 'lust', 'pride', 'sloth', 'gluttony', 'greed']) {
    const v = findVariant('court-serpent', 'sin-' + sin);
    ok(!!v, `sin-${sin} present`);
  }
});

group('Group 2: Black Grail variants', () => {
  ok(!!findVariant('black-grail', 'great-hegemon'), 'great-hegemon (Dirge of the Great Hegemon)');
  ok(!!findVariant('black-grail', 'great-hunger'), 'great-hunger (The Great Hunger)');
  const gh = findVariant('black-grail', 'great-hunger');
  if (gh) {
    ok(typeof gh.summary === 'string' && gh.summary.length > 30,
       'great-hunger has informative summary');
  }
});

group('Group 3: Iron Sultanate variants', () => {
  ok(!!findVariant('iron-sultanate', 'fidai-alamut'), 'fidai-alamut (Fida\'i of Alamut)');
  ok(!!findVariant('iron-sultanate', 'house-wisdom'), 'house-wisdom (House of Wisdom)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
