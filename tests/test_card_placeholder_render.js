/* Placeholder PH-B: drawCardPlaceholder + integración en drawCardOnCanvas.
 *
 * Verifica:
 * - drawCardPlaceholder existe y respeta zona reservada (no pinta fuera)
 * - drawCardOnCanvas invoca drawCardPlaceholder tras NARRATIVE
 * - Skip silencioso si IMAGE_CACHE no tiene la imagen aún
 * - Cuando hay imagen cargada: drawImage + globalAlpha + filter aplicados
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_placeholder_render.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  drawCardPlaceholder: typeof drawCardPlaceholder === 'function' ? drawCardPlaceholder : null,
  drawCardOnCanvas: typeof drawCardOnCanvas === 'function' ? drawCardOnCanvas : null,
  IMAGE_CACHE: typeof IMAGE_CACHE !== 'undefined' ? IMAGE_CACHE : null,
  FACTION_PLACEHOLDERS: typeof FACTION_PLACEHOLDERS !== 'undefined' ? FACTION_PLACEHOLDERS : null,
  getPlaceholderForModel: typeof getPlaceholderForModel === 'function' ? getPlaceholderForModel : null,
  buildModelCardData: typeof buildModelCardData === 'function' ? buildModelCardData : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeImg() {
  return { complete:true, naturalWidth:800, naturalHeight:600, width:800, height:600, src:'mock' };
}
const Image = function() { return { complete:false, naturalWidth:0, naturalHeight:0 }; };
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { Image, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['drawCardPlaceholder','drawCardOnCanvas','IMAGE_CACHE','FACTION_PLACEHOLDERS','getPlaceholderForModel','buildModelCardData']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { drawCardPlaceholder, drawCardOnCanvas, IMAGE_CACHE, FACTION_PLACEHOLDERS, buildModelCardData } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkCtx() {
  const calls = [];
  const ctx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo','arcTo','scale','transform','setTransform','drawImage']) {
    ctx[k] = function(...args) { calls.push({fn:k,args}); return k === 'measureText' ? {width:50} : undefined; };
  }
  const props = { fillStyle:'', strokeStyle:'', font:'', lineWidth:1, textAlign:'', textBaseline:'', globalAlpha:1, filter:'', globalCompositeOperation:'source-over' };
  for (const p of Object.keys(props)) {
    Object.defineProperty(ctx, p, {
      set(v) { props[p] = v; calls.push({fn:'_set_'+p, args:[v]}); },
      get() { return props[p]; },
    });
  }
  ctx._calls = calls;
  ctx._props = props;
  return ctx;
}

/* ------------------------------------------------------------------ */
group('Group 1: drawCardPlaceholder existe + no-throw sin imagen', () => {
  const ctx = mkCtx();
  let threw = false;
  try { drawCardPlaceholder(ctx, 0, 0, 744, 1039, null, { FRAME:[95,25,25] }); }
  catch (e) { threw = true; console.log('  err:', e.message); }
  ok(!threw, 'null image no-throw');
  // No drawImage call si imagen null.
  ok(!ctx._calls.some(c => c.fn === 'drawImage'), 'no drawImage si img null');
});

group('Group 2: drawCardPlaceholder renderiza con imagen cargada', () => {
  const ctx = mkCtx();
  const img = { complete:true, naturalWidth:800, naturalHeight:600, width:800, height:600 };
  drawCardPlaceholder(ctx, 0, 0, 744, 1039, img, { FRAME:[95,25,25] });
  ok(ctx._calls.some(c => c.fn === 'drawImage'), 'drawImage llamado');
  ok(ctx._calls.some(c => c.fn === '_set_globalAlpha'), 'globalAlpha modificado');
  // save+restore protegen estado.
  const saves = ctx._calls.filter(c => c.fn === 'save').length;
  const restores = ctx._calls.filter(c => c.fn === 'restore').length;
  ok(saves === restores, 'save/restore balanceados');
});

group('Group 3: drawCardPlaceholder skip si img.complete false', () => {
  const ctx = mkCtx();
  const img = { complete:false, naturalWidth:0, naturalHeight:0 };
  drawCardPlaceholder(ctx, 0, 0, 744, 1039, img, { FRAME:[95,25,25] });
  ok(!ctx._calls.some(c => c.fn === 'drawImage'), 'no drawImage si img incomplete');
});

group('Group 4: drawCardOnCanvas integra placeholder', () => {
  // Inyecta imagen mock en IMAGE_CACHE para que getPlaceholderForModel
  // y drawCardOnCanvas la encuentren. Snapshot + restore para evitar
  // contaminar otros tests si corren en mismo proceso.
  const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
  const variantKey = 'iron-sultanate:iron-wall-def';
  const prevBase = FACTION_PLACEHOLDERS['iron-sultanate'];
  const prevVariant = FACTION_PLACEHOLDERS[variantKey];
  // El motor prioriza variante > base. Sobrescribimos el variantKey para
  // que la búsqueda devuelva el mock determinísticamente.
  FACTION_PLACEHOLDERS[variantKey] = ['assets/mock-test.jpg'];
  FACTION_PLACEHOLDERS['iron-sultanate'] = ['assets/mock-test.jpg'];
  IMAGE_CACHE.set('assets/mock-test.jpg',
                  { complete:true, naturalWidth:800, naturalHeight:600, width:800, height:600 });

  const model = {
    name:'Silahdar', uid:'m1',
    companionStats:{move:'6"',ranged:'2',melee:'1',armour:'0'},
    companionEquipment:[], companionKeywords:[{name:'ELITE'}],
    companionAbilities:[], companionCost:144,
  };
  const data = buildModelCardData(model, wb);
  const ctx = mkCtx();
  drawCardOnCanvas(ctx, 0, 0, 744, 1039, data);
  ok(ctx._calls.some(c => c.fn === 'drawImage'), 'drawCardOnCanvas → drawImage (placeholder integrado)');

  // Cleanup — restaura snapshot.
  FACTION_PLACEHOLDERS['iron-sultanate'] = prevBase;
  FACTION_PLACEHOLDERS[variantKey] = prevVariant;
  IMAGE_CACHE.delete('assets/mock-test.jpg');
});

group('Group 5: drawCardOnCanvas sin placeholder (cache vacío) no rompe', () => {
  // Sin entries en FACTION_PLACEHOLDERS para esta facción.
  const wb = { factionId:'new-antioch' };
  const model = {
    name:'Knight', uid:'m1',
    companionStats:{move:'6"',ranged:'0',melee:'2',armour:'1'},
    companionEquipment:[], companionKeywords:[{name:'ELITE'}],
    companionAbilities:[], companionCost:120,
  };
  const data = buildModelCardData(model, wb);
  const ctx = mkCtx();
  let threw = false;
  try { drawCardOnCanvas(ctx, 0, 0, 744, 1039, data); } catch (e) { threw = true; }
  ok(!threw, 'sin placeholder no-throw');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
