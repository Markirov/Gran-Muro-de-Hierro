/* Lab 2.0 — Sprint 21 — 4 mapas adicionales.
 *
 * Sobre Sprint 11 (trenchworks + highland-pass). Añade 4 mapas canon
 * adicionales para alcanzar variedad táctica robusta:
 *
 *  - 'city-streets': grid urbano denso. Edificios blocked en grid 6×6,
 *    calles entre ellos. Tema WWI urban combat.
 *  - 'river-crossing': río horizontal y=14-17 blocked excepto 3 puentes
 *    de 3 celdas cada uno. Forza chokepoints.
 *  - 'forest-edge': árboles dispersos como light cover, claro central.
 *    Tema woodland skirmish.
 *  - 'bunker-complex': 6 bunkers heavy cover en formación defensiva
 *    + zona central abierta tipo "killing field".
 *
 * Tests verifican:
 *  - Cada mapa 48×32 canon.
 *  - city-streets ≥ 50 celdas blocked.
 *  - river-crossing tiene río blocked + puentes.
 *  - forest-edge ≥ 20 light cover.
 *  - bunker-complex ≥ 30 heavy cover.
 *  - LAB2_MAPS ≥ 8 mapas total.
 *  - UI dropdown incluye las 4 nuevas.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_extramaps.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  LAB2_MAPS:        typeof LAB2_MAPS !== 'undefined' ? LAB2_MAPS : null,
  getCellCover:     typeof getCellCover === 'function' ? getCellCover : null,
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
const { LAB2_MAPS, getCellCover, getCellTerrain } = lib;

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
group('Group 1: LAB2_MAPS ≥ 8 mapas', () => {
  const ids = Object.keys(LAB2_MAPS);
  ok(ids.length >= 8, '≥8 mapas (got ' + ids.length + ': ' + ids.join(', ') + ')');
});

group('Group 2: city-streets urbano denso', () => {
  const m = LAB2_MAPS['city-streets'];
  ok(!!m, 'mapa presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    const blocked = countCells(m, pos => getCellTerrain(m, pos) === 'blocked');
    ok(blocked >= 50, '≥50 celdas blocked (got ' + blocked + ')');
  }
});

group('Group 3: river-crossing río + puentes', () => {
  const m = LAB2_MAPS['river-crossing'];
  ok(!!m, 'mapa presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    // Río horizontal entre y=14-17. Pero hay puentes abiertos.
    let blockedInRiver = 0, openInRiver = 0;
    for (let x = 0; x < 48; x++) {
      for (let y = 14; y <= 17; y++) {
        if (getCellTerrain(m, {x,y}) === 'blocked') blockedInRiver++;
        else openInRiver++;
      }
    }
    ok(blockedInRiver > openInRiver,
       'mayoría río blocked (' + blockedInRiver + ' blocked vs ' + openInRiver + ' open)');
    ok(openInRiver >= 6, '≥6 celdas open (≥2 puentes de 3 celdas)');
  }
});

group('Group 4: forest-edge ≥ 20 light cover', () => {
  const m = LAB2_MAPS['forest-edge'];
  ok(!!m, 'mapa presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    const light = countCells(m, pos => getCellCover(m, pos) === 'light');
    ok(light >= 20, '≥20 light cover (got ' + light + ')');
  }
});

group('Group 5: bunker-complex ≥ 30 heavy cover', () => {
  const m = LAB2_MAPS['bunker-complex'];
  ok(!!m, 'mapa presente');
  if (m) {
    ok(m.width === 48 && m.height === 32, '48×32 canon');
    const heavy = countCells(m, pos => getCellCover(m, pos) === 'heavy');
    ok(heavy >= 30, '≥30 heavy cover (got ' + heavy + ')');
  }
});

group('Group 6: UI dropdown incluye 4 mapas nuevos', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const sel = doc.getElementById('lab-spatial-map');
  ok(!!sel, 'dropdown presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    for (const id of ['city-streets','river-crossing','forest-edge','bunker-complex']) {
      ok(values.includes(id), 'option ' + id);
    }
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
