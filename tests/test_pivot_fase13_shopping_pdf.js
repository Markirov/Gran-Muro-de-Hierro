/* Fase 13-B PIVOT v2 — Shopping list PDF + UI wire.
 *
 * Verifica:
 * - generateShoppingListPdf rechaza lista vacía (mensaje claro)
 * - Genera Blob PDF cuando hay items
 * - btn-open-shopping + modal-shopping en DOM
 * - btn-shopping-add / clear-checked / pdf wired
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pivot_fase13_pdf.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  generateShoppingListPdf: typeof generateShoppingListPdf === 'function' ? generateShoppingListPdf : null,
  newWarband: typeof newWarband === 'function' ? newWarband : null,
  addShoppingItem: typeof addShoppingItem === 'function' ? addShoppingItem : null,
};
`;
// Stub jsPDF mock que devuelve doc minimal.
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
class StubBlob { constructor(parts, opts){ this.type=(opts&&opts.type)||''; this.size=10; } }
const jspdfStub = {
  jsPDF: function(opts){
    const pages = [];
    return {
      addPage(){pages.push({});}, setFontSize(){}, setTextColor(){},
      setDrawColor(){}, setLineWidth(){}, text(){}, line(){}, rect(){},
      output(){ return new StubBlob(['x'], { type:'application/pdf' }); },
    };
  },
};
const window = { jspdf: jspdfStub, Blob: StubBlob, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['generateShoppingListPdf','newWarband','addShoppingItem']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { generateShoppingListPdf, newWarband, addShoppingItem } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: generateShoppingListPdf rechaza lista vacía', async () => {
  const wb = newWarband('iron-sultanate');
  let threw = false, msg = '';
  try { await generateShoppingListPdf(wb); }
  catch (e) { threw = true; msg = e.message; }
  ok(threw, 'lanza error');
  ok(/vac/i.test(msg), 'mensaje menciona "vacía"');
});

group('Group 2: generateShoppingListPdf con items devuelve blob', async () => {
  const wb = newWarband('iron-sultanate');
  addShoppingItem(wb, { type:'equipment', name:'Bayonet', source:'manual' });
  addShoppingItem(wb, { type:'model', name:'Recruit', source:'manual' });
  const blob = await generateShoppingListPdf(wb);
  ok(blob && blob.type === 'application/pdf', 'devuelve blob PDF');
});

(async () => {
  // Espera a que ambos grupos async resuelvan (corren secuencial).
  await new Promise(r => setTimeout(r, 50));

  // DOM presence checks.
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  group('Group 3: UI presente', () => {
    ok(!!doc.getElementById('btn-open-shopping'), 'btn-open-shopping en header');
    ok(!!doc.getElementById('modal-shopping'), 'modal-shopping');
    ok(!!doc.getElementById('btn-shopping-add'), 'btn-shopping-add');
    ok(!!doc.getElementById('btn-shopping-clear-checked'), 'btn-shopping-clear-checked');
    ok(!!doc.getElementById('btn-shopping-pdf'), 'btn-shopping-pdf');
    ok(!!doc.getElementById('shopping-list-content'), 'shopping-list-content');
  });

  group('Group 4: handlers wired', () => {
    ok(/renderShoppingList/.test(html), 'renderShoppingList definido');
    ok(/groupShoppingItems\(/.test(html), 'groupShoppingItems invocado');
    ok(/generateShoppingListPdf\(/.test(html), 'generateShoppingListPdf invocado');
    ok(/data-shopping-toggle/.test(html), 'delegation toggle');
    ok(/data-shopping-remove/.test(html), 'delegation remove');
  });

  console.log('\n' + pass + ' passed · ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
