/* Lab 2.0 — Sprint 33 — 3 mapas adicionales (Mountain / Desert / Hellscape).
 *
 *  - 'mountain-pass-canyon': cañón estrecho con paredes blocked en y=0-3
 *    y y=28-31; centro abierto con elevation alta (2-3) y light cover
 *    dispersa. Tema cordillera.
 *  - 'desert-convoy': mapa abierto con caravana blocked en y=15-17
 *    centro (4 camiones de 3 celdas) + dunas light cover dispersas.
 *  - 'hellscape': terreno demoníaco. Mucho blocked + 8 cráteres heavy +
 *    "fire walls" light cover quemada. Tema Heretic Legions / Black Grail.
 *
 * LAB2_MAPS pasa de 8 a 11. UI dropdown extendido.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_maps2.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  LAB2_MAPS:        typeof LAB2_MAPS !== 'undefined' ? LAB2_MAPS : null,
  getCellCover:     typeof getCellCover === 'function' ? getCellCover : null,
  getCellTerrain:   typeof getCellTerrain === 'function' ? getCellTerrain : null,
  getCellElevation: typeof getCellElevation === 'function' ? getCellElevation : null,
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
const { LAB2_MAPS, getCellCover, getCellTerrain, getCellElevation } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function countCells(map, predicate) {
  let n = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (predicate({x,y})) n++;
    }
  }
  return n;
}

/* ------------------------------------------------------------------ */
group('Group 1: LAB2_MAPS ≥ 11 mapas total', () => {
  const ids = Object.keys(LAB2_MAPS);
  ok(ids.length >= 11, '≥11 mapas (got ' + ids.length + ')');
});

group('Group 2: mountain-pass-canyon paredes blocked + elevation', () => {
  const m = LAB2_MAPS['mountain-pass-canyon'];
  ok(!!m, 'mapa presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    const blocked = countCells(m, p => getCellTerrain(m, p) === 'blocked');
    ok(blocked >= 100, '≥100 blocked (paredes cañón)');
    const elevated = countCells(m, p => getCellElevation(m, p) > 0);
    ok(elevated >= 10, '≥10 celdas elevated');
  }
});

group('Group 3: desert-convoy caravana central blocked', () => {
  const m = LAB2_MAPS['desert-convoy'];
  ok(!!m, 'mapa presente');
  if (m) {
    let centerBlocked = 0;
    for (let x = 0; x < 48; x++) {
      for (let y = 15; y <= 17; y++) {
        if (getCellTerrain(m, {x,y}) === 'blocked') centerBlocked++;
      }
    }
    ok(centerBlocked >= 10, '≥10 celdas blocked en centro (caravana)');
  }
});

group('Group 4: hellscape blocked + cráteres heavy', () => {
  const m = LAB2_MAPS['hellscape'];
  ok(!!m, 'mapa presente');
  if (m) {
    const blocked = countCells(m, p => getCellTerrain(m, p) === 'blocked');
    const heavy = countCells(m, p => getCellCover(m, p) === 'heavy');
    ok(blocked >= 15, '≥15 blocked (' + blocked + ')');
    ok(heavy >= 20, '≥20 heavy cover (' + heavy + ')');
  }
});

group('Group 5: UI dropdown incluye 3 mapas nuevos', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const sel = doc.getElementById('lab-spatial-map');
  ok(!!sel, 'dropdown presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    for (const id of ['mountain-pass-canyon','desert-convoy','hellscape']) {
      ok(values.includes(id), 'option ' + id);
    }
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
