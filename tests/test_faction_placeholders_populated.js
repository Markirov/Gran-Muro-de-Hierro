/* Roadmap alta prio — Poblar FACTION_PLACEHOLDERS con imágenes WWI reales.
 *
 * Verifica:
 * - Las 6 facciones canon tienen al menos 3 paths poblados.
 * - Cada path referenciado existe en assets/wwi-placeholders/.
 * - Variante iron-sultanate:iron-wall-def tiene override propio.
 * - Convención de paths: 'assets/wwi-placeholders/<nombre>.jpg'.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets', 'wwi-placeholders');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_placeholders.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  FACTION_PLACEHOLDERS: typeof FACTION_PLACEHOLDERS !== 'undefined' ? FACTION_PLACEHOLDERS : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
if (!lib.FACTION_PLACEHOLDERS) { console.error('✗ FACTION_PLACEHOLDERS missing'); process.exit(1); }
const FP = lib.FACTION_PLACEHOLDERS;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
const FACCIONES = ['new-antioch','trench-pilgrims','iron-sultanate','heretic-legions','black-grail','the-court'];

group('Group 1: las 6 facciones canon tienen ≥3 paths', () => {
  for (const f of FACCIONES) {
    const arr = FP[f];
    ok(Array.isArray(arr), f + ' es array');
    ok(Array.isArray(arr) && arr.length >= 3, f + ' tiene ≥3 placeholders (got ' + (arr ? arr.length : 0) + ')');
  }
});

group('Group 2: cada path referenciado existe en assets/wwi-placeholders/', () => {
  const allPaths = new Set();
  for (const arr of Object.values(FP)) {
    if (!Array.isArray(arr)) continue;
    for (const p of arr) allPaths.add(p);
  }
  ok(allPaths.size > 0, 'al menos 1 path acumulado en total');
  let missing = 0;
  for (const p of allPaths) {
    const expected = path.resolve(__dirname, '..', p);
    if (!fs.existsSync(expected)) {
      console.log('    Falta archivo: ' + p);
      missing++;
    }
  }
  ok(missing === 0, 'todos los archivos referenciados existen en disco');
});

group('Group 3: convención de paths assets/wwi-placeholders/*.jpg|JPG', () => {
  for (const [faction, arr] of Object.entries(FP)) {
    if (!Array.isArray(arr)) continue;
    for (const p of arr) {
      ok(/^assets\/wwi-placeholders\//.test(p),
         faction + ' path "' + p + '" empieza por assets/wwi-placeholders/');
      ok(/\.(jpg|JPG|jpeg|png)$/.test(p),
         faction + ' path "' + p + '" extensión válida');
    }
  }
});

group('Group 4: variante iron-sultanate:iron-wall-def tiene override propio', () => {
  const arr = FP['iron-sultanate:iron-wall-def'];
  ok(Array.isArray(arr) && arr.length >= 2,
     'iron-sultanate:iron-wall-def con ≥2 placeholders (got ' + (arr ? arr.length : 0) + ')');
});

group('Group 5: assets/wwi-placeholders/ tiene archivos disponibles', () => {
  ok(fs.existsSync(ASSETS_DIR), 'directorio assets/wwi-placeholders/ existe');
  const files = fs.readdirSync(ASSETS_DIR).filter(f => /\.(jpg|JPG|jpeg|png)$/.test(f));
  ok(files.length >= 30, '≥30 imágenes disponibles (got ' + files.length + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
