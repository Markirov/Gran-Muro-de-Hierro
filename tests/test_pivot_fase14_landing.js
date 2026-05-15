/* Fase 14 PIVOT v2 — Badges + reorganización UI principal.
 *
 * Verifica:
 * - warbandSourceBadgeHtml(wb) devuelve HTML correcto según companionSource
 * - Estilo CSS para .wb-source-badge presente
 * - Footer reorganizado con "Companion offline" + link TC
 * - Banner "modo offline" al usar Nueva Manual
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase14.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  warbandSourceBadgeHtml: typeof warbandSourceBadgeHtml === 'function' ? warbandSourceBadgeHtml : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { warbandSourceBadgeHtml } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: warbandSourceBadgeHtml — banda con companionSource', () => {
  const wb = { companionSource: { 'warband-id': 'wb-123' } };
  const h = warbandSourceBadgeHtml(wb);
  ok(typeof h === 'string', 'devuelve string');
  ok(/wb-source-tc/.test(h), 'CSS class wb-source-tc');
  ok(/TC sync/i.test(h), 'texto "TC sync"');
  ok(/wb-123/.test(h), 'incluye warband-id en title');
});

group('Group 2: warbandSourceBadgeHtml — banda local sin companionSource', () => {
  const wb = { models: [] };
  const h = warbandSourceBadgeHtml(wb);
  ok(/wb-source-local/.test(h), 'CSS class wb-source-local');
  ok(/Local/i.test(h), 'texto "Local"');
});

group('Group 3: warbandSourceBadgeHtml — null defensive', () => {
  ok(warbandSourceBadgeHtml(null) === '', 'null → empty string');
});

group('Group 4: CSS .wb-source-badge presente', () => {
  ok(/\.wb-source-badge/.test(html), '.wb-source-badge declarado');
  ok(/\.wb-source-tc/.test(html), '.wb-source-tc declarado');
  ok(/\.wb-source-local/.test(html), '.wb-source-local declarado');
});

group('Group 5: Footer Fase 14-B reorganizado', () => {
  ok(/Companion offline para Trench Crusade/.test(html),
     'footer dice "Companion offline para Trench Crusade"');
  ok(/trench-companion\.com/.test(html), 'link a TC presente');
});

group('Group 6: Banner modo offline al crear Nueva Manual', () => {
  ok(/Modo offline.*Nueva manual/i.test(html) || /banda local NO oficial/i.test(html),
     'mensaje banner offline visible en handler btn-new');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
