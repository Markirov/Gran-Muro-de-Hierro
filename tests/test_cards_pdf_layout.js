/* Tarjetas PDF 4 por folio: layout 2x2 además del 3x3 por defecto. */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_cards_layout.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  generateCardsPdf: typeof generateCardsPdf === 'function' ? generateCardsPdf : null,
  getCardsPdfLayout: typeof getCardsPdfLayout === 'function' ? getCardsPdfLayout : null,
};
`;
// Stub jsPDF: track pages + addImage calls.
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function makeFakeCtx() {
  const ctx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo','arcTo','scale','transform','setTransform']) {
    ctx[k] = () => k === 'measureText' ? {width:50} : undefined;
  }
  for (const p of ['fillStyle','strokeStyle','font','lineWidth','textAlign','textBaseline','globalAlpha']) {
    Object.defineProperty(ctx, p, {set(){},get(){return '';}});
  }
  return ctx;
}
function makeFakeCanvas(){ return { width:0,height:0,getContext(){return makeFakeCtx();},toDataURL(){return 'data:image/png;base64,STUB';} }; }
function fakeEl(tag){ if(tag==='canvas')return makeFakeCanvas(); return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
// Stub jsPDF
class FakeJsPDF {
  constructor() { this._pages = 1; this._images = []; this._calls = []; }
  addImage(...args) { this._images.push(args); this._calls.push({fn:'addImage'}); return this; }
  addPage(...args) { this._pages += 1; this._calls.push({fn:'addPage',args}); return this; }
  text(...args) { this._calls.push({fn:'text',args}); return this; }
  setFontSize() { return this; }
  setTextColor() { return this; }
  setDrawColor() { return this; }
  setLineWidth() { return this; }
  line() { this._calls.push({fn:'line'}); return this; }
  setProperties() { return this; }
  output(type) {
    if (type === 'blob') {
      const blob = { type: 'application/pdf', _pdf: this, _pages: this._pages, size: 100 };
      return blob;
    }
    return '';
  }
  internal = {
    getNumberOfPages: () => this._pages,
    pageSize: { getWidth: () => 210, getHeight: () => 297 },
  };
}
const window = { jspdf:{ jsPDF: FakeJsPDF }, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){}, URL: { createObjectURL(){return '';}, revokeObjectURL(){} } };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['generateCardsPdf','getCardsPdfLayout']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { generateCardsPdf, getCardsPdfLayout } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
const near = (a, b) => Math.abs(a - b) < 0.01;

const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def', name:'Test' };
function mkModels(n) {
  return Array.from({length:n}, (_,i) => ({
    name:'M'+i, uid:'m'+i,
    companionStats:{move:'6"',ranged:'1',melee:'0',armour:'0'},
    companionEquipment:[],companionKeywords:[],companionAbilities:[],companionCost:30,
  }));
}

(async () => {
  console.log('\nGroup 1: getCardsPdfLayout');
  const l3 = getCardsPdfLayout('3x3');
  ok(l3.cols === 3 && l3.rows === 3 && l3.perPage === 9, '3x3 → 3 cols, 3 rows, 9 por página');
  ok(l3.cardW === 63 && l3.cardH === 88, '3x3 → tarjeta 63×88 mm');
  const l2 = getCardsPdfLayout('2x2');
  ok(l2.cols === 2 && l2.rows === 2 && l2.perPage === 4, '2x2 → 2 cols, 2 rows, 4 por página');
  ok(near(l2.cardW, 94.5) && near(l2.cardH, 132), '2x2 → tarjeta 94,5×132 mm (×1,5)');
  ok(near(l2.cardW / l2.cardH, 63 / 88), '2x2 mantiene proporción Magic');
  ok(l2.cols * l2.cardW <= 210 && l2.rows * l2.cardH <= 297, '2x2 cabe en A4');
  ok(near(l2.marginX, (210 - 2 * 94.5) / 2) && near(l2.marginY, (297 - 2 * 132) / 2), '2x2 centrada en A4');
  ok(getCardsPdfLayout().perPage === 9, 'sin argumento → 3x3 por defecto');
  ok(getCardsPdfLayout('basura').perPage === 9, 'layout desconocido → 3x3');

  console.log('\nGroup 2: generateCardsPdf 2x2 paginación');
  const b4 = await generateCardsPdf({ ...wb, models: mkModels(4) }, { layout: '2x2' });
  ok(b4._pages === 1, `4 modelos → 1 página (got ${b4._pages})`);
  const b5 = await generateCardsPdf({ ...wb, models: mkModels(5) }, { layout: '2x2' });
  ok(b5._pages === 2, `5 modelos → 2 páginas (got ${b5._pages})`);
  const b9 = await generateCardsPdf({ ...wb, models: mkModels(9) }, { layout: '2x2' });
  ok(b9._pages === 3, `9 modelos → 3 páginas (got ${b9._pages})`);

  console.log('\nGroup 3: generateCardsPdf 2x2 posiciones y tamaño');
  const imgs = b5._pdf._images; // [data, 'PNG', x, y, w, h]
  ok(imgs.length === 5, '5 addImage');
  ok(imgs.every(a => near(a[4], 94.5) && near(a[5], 132)), 'todas a 94,5×132');
  const mx = (210 - 189) / 2, my = (297 - 264) / 2;
  ok(near(imgs[0][2], mx) && near(imgs[0][3], my), 'tarjeta 0 arriba-izquierda');
  ok(near(imgs[1][2], mx + 94.5) && near(imgs[1][3], my), 'tarjeta 1 arriba-derecha');
  ok(near(imgs[2][2], mx) && near(imgs[2][3], my + 132), 'tarjeta 2 abajo-izquierda');
  ok(near(imgs[3][2], mx + 94.5) && near(imgs[3][3], my + 132), 'tarjeta 3 abajo-derecha');
  ok(near(imgs[4][2], mx) && near(imgs[4][3], my), 'tarjeta 4 vuelve a arriba-izquierda en página 2');

  console.log('\nGroup 4: 3x3 sigue siendo el default');
  const d = await generateCardsPdf({ ...wb, models: mkModels(10) });
  ok(d._pages === 2, '10 modelos sin opciones → 2 páginas');
  ok(d._pdf._images.every(a => a[4] === 63 && a[5] === 88), 'sin opciones → 63×88');

  console.log('\nGroup 5: UI selector de formato');
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  ok(html.includes('id="modal-cards-layout"'), 'modal-cards-layout existe');
  ok(/data-cards-layout="3x3"/.test(html) && /data-cards-layout="2x2"/.test(html), 'botones 3x3 y 2x2');
  ok(/9 por folio/.test(html) && /4 por folio/.test(html), 'textos "9 por folio" y "4 por folio"');
  ok(/wf-cards-layout/.test(html), 'recuerda la elección (localStorage wf-cards-layout)');

  console.log('\n' + pass + ' passed · ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
