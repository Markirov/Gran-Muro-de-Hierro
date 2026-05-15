/* Fase 4: renderBattletrackerCanvas + drawTrackerPanelOnCanvas.
 * 1748×1240 (148×105mm @ 300dpi). Bloque MAESTRO condicional.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_tracker.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  renderBattletrackerCanvas: typeof renderBattletrackerCanvas === 'function' ? renderBattletrackerCanvas : null,
  drawTrackerPanelOnCanvas: typeof drawTrackerPanelOnCanvas === 'function' ? drawTrackerPanelOnCanvas : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function makeFakeCtx() {
  const ctx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo','arcTo','scale','transform','setTransform']) {
    ctx[k] = function() { return k === 'measureText' ? {width: 50} : undefined; };
  }
  for (const prop of ['fillStyle','strokeStyle','font','lineWidth','textAlign','textBaseline','globalAlpha']) {
    Object.defineProperty(ctx, prop, {set(){},get(){return '';}});
  }
  return ctx;
}
function makeFakeCanvas() {
  return { width:0, height:0, getContext(){return makeFakeCtx();}, toDataURL(){return 'data:image/png;base64,STUB' + this.width + 'x' + this.height;} };
}
function fakeEl(tag){ if(tag==='canvas')return makeFakeCanvas(); return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['renderBattletrackerCanvas','drawTrackerPanelOnCanvas']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { renderBattletrackerCanvas } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
const silahdar = {
  name:'Silahdar', uid:'m1',
  companionStats:{move:'6"',ranged:'2',melee:'1',armour:'0'},
  companionEquipment:[],companionKeywords:[{name:'ELITE'}],
  companionAbilities:[],companionCost:144,
};
const jabirean = {
  name:'Jabirean Alchemist', uid:'m2',
  companionStats:{move:'6"',ranged:'1',melee:'0',armour:'0'},
  companionEquipment:[{name:'Alchemist Armour'}],companionKeywords:[{name:'ELITE'},{name:'ALCHEMIST'}],
  companionAbilities:[{name:'Mastery of the Elements'}],
  companionCost:120,
};

group('Group 1: renderBattletrackerCanvas devuelve dataURL', () => {
  const r = renderBattletrackerCanvas(silahdar, wb);
  ok(typeof r === 'string', 'returns string');
  ok(/^data:image\/png;base64,/.test(r), 'PNG dataURL');
});

group('Group 2: canvas 1748×1240', () => {
  const r = renderBattletrackerCanvas(silahdar, wb);
  ok(/1748x1240/.test(r), 'dimensiones canon');
});

group('Group 3: defensive', () => {
  let threw = false;
  try { renderBattletrackerCanvas(null, wb); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
  try { renderBattletrackerCanvas(jabirean, null); } catch (e) { threw = true; }
  ok(!threw, 'null wb no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
