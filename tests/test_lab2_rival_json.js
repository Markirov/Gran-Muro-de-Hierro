/* Lab 2.0 — Sprint 13 — Paste JSON Companion como rival.
 *
 * Sobre Sprint 9 (selector mirror + 6 arquetipos). Añade alternativa
 * "JSON Companion": el usuario pega un JSON exportado de TC y la banda
 * rival se construye de sus models directamente.
 *
 *  - Textarea #lab-spatial-rival-json + botón "Cargar rival JSON".
 *  - Aparece cuando el dropdown #lab-spatial-rival está en valor "json".
 *  - Helper _lab2ParseRivalJson(text): valida JSON + extrae models con
 *    el shape companion (los modelos ya vienen así en TC export).
 *  - LAB2_RIVAL_JSON variable cachea la última banda parseada.
 *  - Handler de Run usa LAB2_RIVAL_JSON si dropdown==='json'.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_rivaljson.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  _lab2ParseRivalJson: typeof _lab2ParseRivalJson === 'function' ? _lab2ParseRivalJson : null,
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
if (!lib._lab2ParseRivalJson) { console.error('✗ _lab2ParseRivalJson missing'); process.exit(1); }
const { _lab2ParseRivalJson } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: parse JSON Companion válido', () => {
  const json = JSON.stringify({
    'warband-name': 'Test Rival',
    'warband-id': 99999,
    models: [
      { 'model-name': 'A', 'stat-move': '6"/Infantry', 'stat-ranged': '+1', 'stat-melee': '+1', 'stat-armour': '0', cost: { ducats: 30 }, equipment: [], abilities: [], keywords: [] },
      { 'model-name': 'B', 'stat-move': '6"/Infantry', 'stat-ranged': '+2', 'stat-melee': '+0', 'stat-armour': '-1', cost: { ducats: 45 }, equipment: [], abilities: [], keywords: [] },
    ],
  });
  const r = _lab2ParseRivalJson(json);
  ok(r.ok === true, 'ok:true');
  ok(Array.isArray(r.models) && r.models.length === 2, '2 modelos parseados');
  ok(r.models[0].companionStats.ranged === '+1', 'companionStats.ranged "+1"');
  ok(r.models[0].uid && r.models[0].uid.length > 0, 'uid generado');
});

group('Group 2: JSON inválido → ok:false con error', () => {
  const r = _lab2ParseRivalJson('{not valid');
  ok(r.ok === false, 'ok:false');
  ok(typeof r.error === 'string' && r.error.length > 0, 'error string');
});

group('Group 3: JSON sin models → ok:false', () => {
  const r = _lab2ParseRivalJson('{"warband-name":"X"}');
  ok(r.ok === false, 'ok:false');
  ok(/models/i.test(r.error || ''), 'error menciona models');
});

group('Group 4: UI textarea + botón presentes', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  ok(!!doc.getElementById('lab-spatial-rival-json'), '#lab-spatial-rival-json textarea presente');
  ok(!!doc.getElementById('btn-lab-spatial-rival-load'), '#btn-lab-spatial-rival-load botón presente');
  // Dropdown rival debe tener option "json".
  const sel = doc.getElementById('lab-spatial-rival');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    ok(values.includes('json'), 'option "json" en dropdown rival');
  }
});

group('Group 5: handler invoca _lab2ParseRivalJson + LAB2_RIVAL_JSON', () => {
  ok(/_lab2ParseRivalJson/.test(html), 'script referencia _lab2ParseRivalJson');
  ok(/LAB2_RIVAL_JSON/.test(html), 'variable LAB2_RIVAL_JSON referenciada');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
