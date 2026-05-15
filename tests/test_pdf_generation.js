/* Fase 5: generateCardsPdf + generateTrackersPdf con jsPDF stub. */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pdf_gen.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  generateCardsPdf: typeof generateCardsPdf === 'function' ? generateCardsPdf : null,
  generateTrackersPdf: typeof generateTrackersPdf === 'function' ? generateTrackersPdf : null,
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
for (const h of ['generateCardsPdf','generateTrackersPdf']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { generateCardsPdf, generateTrackersPdf } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def', name:'Test' };
function mkModels(n) {
  return Array.from({length:n}, (_,i) => ({
    name:'M'+i, uid:'m'+i,
    companionStats:{move:'6"',ranged:'1',melee:'0',armour:'0'},
    companionEquipment:[],companionKeywords:[],companionAbilities:[],companionCost:30,
  }));
}

group('Group 1: generateCardsPdf devuelve Blob', async () => {
  const blob = await generateCardsPdf({ ...wb, models: mkModels(3) });
  ok(blob && blob.type === 'application/pdf', 'Blob type = application/pdf');
});

group('Group 2: paginación cards', async () => {
  const b9 = await generateCardsPdf({ ...wb, models: mkModels(9) });
  ok(b9._pages === 1, `9 modelos → 1 página (got ${b9._pages})`);
  const b10 = await generateCardsPdf({ ...wb, models: mkModels(10) });
  ok(b10._pages === 2, `10 modelos → 2 páginas (got ${b10._pages})`);
  const b18 = await generateCardsPdf({ ...wb, models: mkModels(18) });
  ok(b18._pages === 2, `18 modelos → 2 páginas (got ${b18._pages})`);
  const b19 = await generateCardsPdf({ ...wb, models: mkModels(19) });
  ok(b19._pages === 3, `19 modelos → 3 páginas (got ${b19._pages})`);
});

group('Group 3: paginación trackers', async () => {
  const b1 = await generateTrackersPdf({ ...wb, models: mkModels(1) });
  ok(b1._pages === 1, `1 modelo → 1 página`);
  const b2 = await generateTrackersPdf({ ...wb, models: mkModels(2) });
  ok(b2._pages === 1, `2 modelos → 1 página`);
  const b3 = await generateTrackersPdf({ ...wb, models: mkModels(3) });
  ok(b3._pages === 2, `3 modelos → 2 páginas`);
  const b9 = await generateTrackersPdf({ ...wb, models: mkModels(9) });
  ok(b9._pages === 5, `9 modelos → 5 páginas (got ${b9._pages})`);
});

group('Group 4: addImage llamado por modelo', async () => {
  const b = await generateCardsPdf({ ...wb, models: mkModels(3) });
  ok(b._pdf._images.length === 3, `3 modelos → 3 addImage calls`);
});

group('Group 5: error claro con 0 modelos', async () => {
  let threw = false; let msg = '';
  try { await generateCardsPdf({ ...wb, models: [] }); }
  catch (e) { threw = true; msg = e.message; }
  ok(threw, 'lanza error');
  ok(/modelos|empty|vacía/i.test(msg), 'mensaje contiene "modelos/empty/vacía"');
});

// Wait for async groups (small delay).
setTimeout(() => {
  console.log('\n' + pass + ' passed · ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
}, 200);
