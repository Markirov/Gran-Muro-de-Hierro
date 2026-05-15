/* Fase 2: renderCardCanvas + canvas básico.
 *
 * No verificamos píxel-a-píxel (Lab no tiene jsdom canvas real). Sí
 * verificamos: función existe, llamada con canvas stub correcta, y
 * el método toDataURL se invoca.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_card_render.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  renderCardCanvas: typeof renderCardCanvas === 'function' ? renderCardCanvas : null,
  drawCardOnCanvas: typeof drawCardOnCanvas === 'function' ? drawCardOnCanvas : null,
};
`;
// Stub canvas: track calls + return predictable dataURL.
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function makeFakeCtx() {
  const calls = [];
  const ctx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo','arcTo','scale','transform','setTransform']) {
    ctx[k] = function(...args) { calls.push({fn: k, args}); return k === 'measureText' ? {width: 50} : undefined; };
  }
  Object.defineProperty(ctx, 'fillStyle', {set(){},get(){return '';}});
  Object.defineProperty(ctx, 'strokeStyle', {set(){},get(){return '';}});
  Object.defineProperty(ctx, 'font', {set(){},get(){return '';}});
  Object.defineProperty(ctx, 'lineWidth', {set(){},get(){return 0;}});
  Object.defineProperty(ctx, 'textAlign', {set(){},get(){return '';}});
  Object.defineProperty(ctx, 'textBaseline', {set(){},get(){return '';}});
  Object.defineProperty(ctx, 'globalAlpha', {set(){},get(){return 1;}});
  ctx._calls = calls;
  return ctx;
}
function makeFakeCanvas(name) {
  const ctx = makeFakeCtx();
  return {
    width: 0, height: 0,
    _name: name,
    getContext() { return ctx; },
    toDataURL() { return 'data:image/png;base64,STUB' + this.width + 'x' + this.height + (name || ''); },
  };
}
function fakeEl(tag){ if (tag === 'canvas') return makeFakeCanvas(); return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['renderCardCanvas','drawCardOnCanvas']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { renderCardCanvas, drawCardOnCanvas } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
const model = {
  name: 'Silahdar', uid:'m1',
  companionStats: { move:'6"', ranged:'2', melee:'1', armour:'0' },
  companionEquipment: [{name:'Binoculars'},{name:'Sword',type:'melee weapon',range:'Melee',dice:'2',injury:'1'}],
  companionKeywords: [{name:'ELITE'},{name:'OFFICER'}],
  companionAbilities: [],
  companionCost: 144,
};

/* ------------------------------------------------------------------ */
group('Group 1: renderCardCanvas devuelve dataURL', () => {
  const result = renderCardCanvas(model, wb);
  ok(typeof result === 'string', 'returns string');
  ok(/^data:image\/png;base64,/.test(result), 'matches PNG dataURL pattern');
});

group('Group 2: canvas dimensions correctas', () => {
  const result = renderCardCanvas(model, wb);
  ok(/744x1039/.test(result), 'canvas is 744×1039 (encoded in stub dataURL)');
});

group('Group 3: drawCardOnCanvas existe + se invoca', () => {
  const fakeCtx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo','arcTo','scale','transform','setTransform']) {
    fakeCtx[k] = () => {};
  }
  fakeCtx.measureText = () => ({width:50});
  Object.defineProperty(fakeCtx, 'fillStyle', {set(){},get(){return '';}});
  Object.defineProperty(fakeCtx, 'strokeStyle', {set(){},get(){return '';}});
  Object.defineProperty(fakeCtx, 'font', {set(){},get(){return '';}});
  Object.defineProperty(fakeCtx, 'lineWidth', {set(){},get(){return 0;}});
  Object.defineProperty(fakeCtx, 'textAlign', {set(){},get(){return '';}});
  Object.defineProperty(fakeCtx, 'textBaseline', {set(){},get(){return '';}});
  Object.defineProperty(fakeCtx, 'globalAlpha', {set(){},get(){return 1;}});
  let threw = false;
  try { drawCardOnCanvas(fakeCtx, 0, 0, 744, 1039, { palette: { BG:'#fff', FRAME:'#000', ACCENT:'#aaa', TEXT:'#000', MUTED:'#666', STAT_BG:'#eee', PANEL_BG:'#ddd', PROGRESS:'#aaa', ornament:'crescent' }, nameL1:'X', nameL2:'', role:'', cost:0, factionTop:'', factionBot:'', stats:[], weapons:[], abilities:[], battlekit:[], pe:{current:0,max:12}, advancements:0, scars:0, record:'', narrative:'' }); }
  catch(e) { threw = true; console.log('err:', e.message); }
  ok(!threw, 'drawCardOnCanvas ejecuta sin throw');
});

group('Group 4: defensive', () => {
  let threw = false;
  try { renderCardCanvas(null, wb); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
