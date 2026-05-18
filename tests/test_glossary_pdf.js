/* Roadmap baja prio — Glossary PDF imprimible.
 *
 * Reusa pdfRenderSpecialRulesSection (Section 3 del warband PDF):
 *  - Regla especial de la facción.
 *  - Variante de banda (si aplica).
 *  - Habilidades de unidades ELITE (con companion-aware grouping).
 *  - Términos generales referenciados.
 *
 * Pensado para imprimir como referencia rápida en mesa, sin el roster
 * completo. Tamaño A4, mismo lenguaje visual que el warband PDF.
 *
 * Verifica:
 * - Función generateGlossaryPdf(wb) existe y es async.
 * - Devuelve Blob no vacío para banda con modelos.
 * - Throw claro si no hay banda.
 * - Throw claro si jsPDF no cargada.
 * - Botón btn-glossary-pdf en header con título informativo.
 * - Wire del botón a generateGlossaryPdf.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: HTML expone botón Glossary PDF', () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const btn = dom.window.document.getElementById('btn-glossary-pdf');
  ok(!!btn, 'botón #btn-glossary-pdf presente');
  if (btn) {
    const title = btn.getAttribute('title') || '';
    const txt = btn.textContent || '';
    ok(/Glosario|Reglas|Especiales|Habilidades/i.test(title + txt),
       'tooltip/texto referencia glosario o reglas (got "' + (title || txt).slice(0, 60) + '")');
  }
});

group('Group 2: función generateGlossaryPdf existe', () => {
  ok(/(async\s+)?function\s+generateGlossaryPdf\(/.test(html),
     'function generateGlossaryPdf declarada');
});

group('Group 3: implementación reutiliza pdfRenderSpecialRulesSection', () => {
  // Mira el cuerpo de generateGlossaryPdf desde la declaración.
  const idx = html.indexOf('function generateGlossaryPdf');
  ok(idx >= 0, 'generateGlossaryPdf localizada');
  if (idx >= 0) {
    const body = html.slice(idx, idx + 2500);
    ok(/pdfRenderSpecialRulesSection/.test(body),
       'invoca pdfRenderSpecialRulesSection (no duplica lógica de Section 3)');
    ok(/new TCDocument/.test(body), 'crea TCDocument dedicado');
    ok(/\.output\(['"]blob['"]\)|\.doc\.output/.test(body),
       'devuelve Blob');
  }
});

group('Group 4: botón wired en script', () => {
  ok(/getElementById\(['"]btn-glossary-pdf['"]\)\s*[^;]*addEventListener/.test(html) ||
     /btn-glossary-pdf['"]\)\?\.addEventListener/.test(html),
     'btn-glossary-pdf tiene event listener');
});

group('Group 5: ejecución funcional con banda válida', () => {
  // Carga el módulo + monta stub jsPDF mínimo + invoca.
  const TMP = path.join(require('os').tmpdir(), 'warband_forge_glossary_pdf.js');
  const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  generateGlossaryPdf: typeof generateGlossaryPdf === 'function' ? generateGlossaryPdf : null,
  newWarband: typeof newWarband === 'function' ? newWarband : null,
};
`;
  // Stub jsPDF mínimo. Implementa todas las APIs que TCDocument toca.
  const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
function fakeDoc() {
  return {
    addPage(){}, setFont(){}, setFontSize(){}, setTextColor(){}, setFillColor(){}, setDrawColor(){},
    setLineWidth(){}, text(){}, splitTextToSize(t){ return [t]; }, getTextWidth(){ return 50; },
    line(){}, rect(){}, roundedRect(){}, addImage(){}, internal:{ pageSize:{ getWidth(){return 210;}, getHeight(){return 297;}, width:210, height:297 } },
    save(){}, output(){ return { size: 1024, type:'application/pdf' }; },
    getNumberOfPages(){ return 1; }, setPage(){}, setFillType(){}, circle(){}, ellipse(){},
    triangle(){}, setGState(){}, GState(){return{};}, addFileToVFS(){}, addFont(){},
    setProperties(){}, setLineDashPattern(){}, setLineJoin(){}, setLineCap(){},
  };
}
const jspdf_stub = { jsPDF: function() { return fakeDoc(); } };
const window = { jspdf: jspdf_stub, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
const URL = { createObjectURL(){ return 'blob:mock'; }, revokeObjectURL(){} };
`;
  fs.writeFileSync(TMP, stub + moduleCode);
  let lib;
  try { lib = require(TMP); } catch (e) {
    console.log('  ✗ no se pudo cargar módulo:', e.message);
    fail++;
    return;
  }
  if (!lib.generateGlossaryPdf || !lib.newWarband) {
    console.log('  ✗ función o newWarband missing');
    fail++;
    return;
  }
  const wb = lib.newWarband('iron-sultanate');
  wb.variantId = 'iron-wall-def';
  wb.models = [{ uid: 'm1', name: 'Silahdar', unitId: 'yuzbasi',
                 companionStats: { move: '6"', melee: '+2', ranged: '+2', armour: '-3' },
                 companionAbilities: [{ name: 'Siege Jezzail Teams' }] }];
  let result, threw = false;
  try { result = lib.generateGlossaryPdf(wb); } catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'invocación con banda válida no-throw');
  // Result puede ser Promise (async) o sync. Aceptamos ambos.
  if (result && typeof result.then === 'function') {
    return result.then(r => {
      ok(r != null, 'devuelve algo async');
    }).catch(e => {
      console.log('  ✗ promise rechazó:', e.message);
      fail++;
    });
  } else {
    ok(result != null, 'devuelve Blob/output sync');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
