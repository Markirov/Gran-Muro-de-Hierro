/* Sub-C: ornamentos custom por faction/variant.
 * drawOrnament dispatch para 12+ keys: papal_cross, thistle, crescent,
 * iron_cross, inverted_pentacle, plague_skull, serpent_coil, iron_eagle,
 * celtic_knot, red_star, dagger, astrolabe.
 * Smoke check: cada draw* function ejecuta sin throw.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_ornaments.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = { drawOrnament };
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
const { drawOrnament } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkCtx() {
  const calls = [];
  const ctx = {};
  for (const k of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','arc','closePath','fill','stroke','save','restore','clip','translate','rotate','setLineDash','measureText','rect','ellipse','quadraticCurveTo','bezierCurveTo']) {
    ctx[k] = function(...args) { calls.push({fn:k,args}); return k==='measureText'?{width:50}:undefined; };
  }
  for (const p of ['fillStyle','strokeStyle','font','lineWidth','textAlign','textBaseline','globalAlpha']) {
    Object.defineProperty(ctx, p, {set(){},get(){return '';}});
  }
  ctx._calls = calls;
  return ctx;
}

// SPEC v2 — 14 ornamentos canon.
const KEYS = ['papal_cross','crossed_keys','thistle','prussian_eagle','irish_harp',
              'lion_of_judah','iron_cross_rough','crescent','jambiya','astrolabe',
              'fortified_tower','inverted_star','fly_cross','seven_headed_serpent'];

function mkPalette(k) {
  // Acepta UPPER y lower. Test pasa UPPER (SPEC v2 canon).
  return {
    ORNAMENT: k,
    ACCENT:'#aaa', ACCENT_DK:'#666', VARIANT:'#888', VARIANT_DK:'#444',
    BG:'#fff', FRAME:'#000', FRAME_DARK:'#222',
    INFERNAL:'#c66', PLAGUE:'#ada', PLAGUE_DK:'#686',
    CROWN_GOLD:'#d4a040', IRON:'#555',
  };
}

group('Group 1: cada ornament ejecuta sin throw', () => {
  for (const k of KEYS) {
    const ctx = mkCtx();
    let threw = false;
    try { drawOrnament(ctx, 50, 50, mkPalette(k), 12); }
    catch (e) { threw = true; console.log('  ', k, 'err:', e.message); }
    ok(!threw, k + ' no-throw');
  }
});

group('Group 2: cada ornament emite ≥1 stroke o fill', () => {
  for (const k of KEYS) {
    const ctx = mkCtx();
    drawOrnament(ctx, 50, 50, mkPalette(k), 12);
    const drew = ctx._calls.some(c => c.fn === 'stroke' || c.fn === 'fill' || c.fn === 'fillRect' || c.fn === 'strokeRect');
    ok(drew, k + ' emite stroke/fill');
  }
});

group('Group 3: ornament desconocido → default papal_cross', () => {
  const ctx = mkCtx();
  let threw = false;
  try { drawOrnament(ctx, 50, 50, { ORNAMENT:'unknown_xyz', ACCENT:'#aaa', VARIANT:'#888' }, 12); }
  catch (e) { threw = true; }
  ok(!threw, 'unknown ornament → default fallback no-throw');
});

group('Group 4: drawOrnament acepta lower-case `ornament` (back-compat)', () => {
  const ctx = mkCtx();
  let threw = false;
  try { drawOrnament(ctx, 50, 50, { ornament:'crescent', ACCENT:'#aaa', BG:'#fff' }, 12); }
  catch (e) { threw = true; }
  ok(!threw, 'lower-case ornament key no-throw');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
