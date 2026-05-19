/* Lab 2.0 — Sprint 9 — Selector de banda rival (mirror + arquetipos canon).
 *
 * Sobre Sprint 8 (UI wire mirror match). Reemplaza el espejo automático
 * con un dropdown que permite elegir contra qué banda enfrentarse:
 *
 *   - 'mirror': clon del wb (Sprint 8 default).
 *   - 'newAntioch' | 'trenchPilgrims' | 'ironSultanate' |
 *     'hereticLegions' | 'blackGrail' | 'courtSerpent':
 *     banda sintética de las 6 facciones canon, escalada al count del wb.
 *
 * Helper expuesto: _lab2SyntheticEnemyBand(archetypeKey, count) devuelve
 * array de companion-shape models construido a partir de FILL_MODEL_PROFILES
 * (abstract → companion adapter).
 *
 * Tests verifican:
 *  - Dropdown #lab-spatial-rival en panel con ≥4 opciones (mirror + 3 fac).
 *  - Helper produce companion-shape válida (companionStats + Equipment + KW).
 *  - Count del helper respeta el N pedido.
 *  - Handler del botón lee el dropdown.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_rival.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  _lab2SyntheticEnemyBand: typeof _lab2SyntheticEnemyBand === 'function' ? _lab2SyntheticEnemyBand : null,
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
if (!lib._lab2SyntheticEnemyBand) { console.error('✗ _lab2SyntheticEnemyBand missing'); process.exit(1); }
const { _lab2SyntheticEnemyBand } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: helper produce N companion-shape models', () => {
  const band = _lab2SyntheticEnemyBand('ironSultanate', 5);
  ok(Array.isArray(band), 'devuelve array');
  ok(band.length === 5, '5 modelos (count respetado)');
  for (const m of band) {
    ok(typeof m.uid === 'string' && m.uid.length > 0, 'uid string no vacío');
    ok(typeof m.name === 'string', 'name string');
    ok(m.companionStats && typeof m.companionStats.ranged === 'string',
       'companionStats con ranged como string canon ("+N")');
    ok(Array.isArray(m.companionKeywords), 'companionKeywords array');
    ok(Array.isArray(m.companionEquipment), 'companionEquipment array');
  }
});

group('Group 2: archetype keys soportados', () => {
  for (const key of ['newAntioch','trenchPilgrims','ironSultanate','hereticLegions','blackGrail','courtSerpent']) {
    const band = _lab2SyntheticEnemyBand(key, 3);
    ok(Array.isArray(band) && band.length === 3,
       'archetype ' + key + ' produce banda de 3');
  }
});

group('Group 3: archetype desconocido → fallback razonable', () => {
  const band = _lab2SyntheticEnemyBand('nonexistent', 3);
  ok(Array.isArray(band) && band.length === 3,
     'fallback devuelve 3 modelos genéricos');
});

group('Group 4: UI tiene dropdown rival con opciones', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const sel = doc.getElementById('lab-spatial-rival');
  ok(!!sel, '#lab-spatial-rival dropdown presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    ok(values.includes('mirror'), 'option mirror');
    ok(values.length >= 4, '≥4 opciones (mirror + 3 archetypes)');
  }
});

group('Group 5: handler btn-lab-spatial-run lee dropdown', () => {
  ok(/lab-spatial-rival/.test(html),
     'script referencia lab-spatial-rival');
  ok(/_lab2SyntheticEnemyBand/.test(html),
     'script invoca _lab2SyntheticEnemyBand');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
