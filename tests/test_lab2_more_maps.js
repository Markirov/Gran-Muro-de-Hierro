/* Lab 2.0 — Sprint 11 — Más mapas: Trenchworks + Highland Pass.
 *
 * Sobre Sprint 1 (foundation mapas). Añade 2 mapas canon adicionales:
 *
 *  - 'trenchworks': trincheras WWI horizontales con heavy cover lineal.
 *    3 trincheras paralelas a y=8, y=16, y=24 con gaps periódicos.
 *  - 'highland-pass': camino con colinas elevated central + rocas dispersas.
 *    Tema Alba/Highland NA. 3 colinas con elevation 1-2 + 4 rocas.
 *
 * Tests verifican:
 *  - Mapas presentes con dimensiones 48×32 canon.
 *  - trenchworks tiene heavy cover ≥30 celdas (filas).
 *  - highland-pass tiene elevation > 0 en al menos 1 celda.
 *  - LAB2_MAPS total ≥ 4 mapas.
 *  - UI dropdown #lab-spatial-map incluye las 2 opciones nuevas.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_maps.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  LAB2_MAPS: typeof LAB2_MAPS !== 'undefined' ? LAB2_MAPS : null,
  getCellCover:     typeof getCellCover === 'function' ? getCellCover : null,
  getCellElevation: typeof getCellElevation === 'function' ? getCellElevation : null,
  getCellTerrain:   typeof getCellTerrain === 'function' ? getCellTerrain : null,
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
const { LAB2_MAPS, getCellCover, getCellElevation, getCellTerrain } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: LAB2_MAPS ≥ 4 mapas', () => {
  const ids = Object.keys(LAB2_MAPS);
  ok(ids.length >= 4, 'tiene ≥4 mapas (got ' + ids.length + ': ' + ids.join(', ') + ')');
});

group('Group 2: trenchworks 48×32 con cover lineal', () => {
  const m = LAB2_MAPS['trenchworks'];
  ok(!!m, 'mapa trenchworks presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    let heavyCount = 0;
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        if (getCellCover(m, {x,y}) === 'heavy') heavyCount++;
      }
    }
    ok(heavyCount >= 30, 'al menos 30 celdas heavy cover (got ' + heavyCount + ')');
  }
});

group('Group 3: highland-pass con elevation > 0', () => {
  const m = LAB2_MAPS['highland-pass'];
  ok(!!m, 'mapa highland-pass presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    let elevatedCount = 0, blockedCount = 0;
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        if (getCellElevation(m, {x,y}) > 0) elevatedCount++;
        if (getCellTerrain(m, {x,y}) === 'blocked') blockedCount++;
      }
    }
    ok(elevatedCount >= 1, 'al menos 1 celda elevated (got ' + elevatedCount + ')');
    ok(blockedCount >= 1, 'al menos 1 celda blocked/rocks (got ' + blockedCount + ')');
  }
});

group('Group 4: UI dropdown #lab-spatial-map incluye nuevos mapas', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const sel = doc.getElementById('lab-spatial-map');
  ok(!!sel, 'dropdown presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    ok(values.includes('trenchworks'), 'option trenchworks');
    ok(values.includes('highland-pass'), 'option highland-pass');
    ok(values.length >= 4, '≥4 opciones (open + ruined + trench + highland)');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
