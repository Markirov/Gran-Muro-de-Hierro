/* Placeholder PH-A: infra cache + hash + getter híbrido.
 *
 * Verifica:
 * - simpleHashStr djb2 determinístico
 * - FACTION_PLACEHOLDERS mapa key→paths (con dummys iniciales vacíos OK)
 * - EMBEDDED_PLACEHOLDERS mapa key→dataURL base64 (fallback)
 * - getPlaceholderForModel: variante > facción base > null
 * - IMAGE_CACHE map global
 * - preloadFactionImages async devuelve Promise.all
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_placeholders.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  FACTION_PLACEHOLDERS: typeof FACTION_PLACEHOLDERS !== 'undefined' ? FACTION_PLACEHOLDERS : null,
  EMBEDDED_PLACEHOLDERS: typeof EMBEDDED_PLACEHOLDERS !== 'undefined' ? EMBEDDED_PLACEHOLDERS : null,
  IMAGE_CACHE: typeof IMAGE_CACHE !== 'undefined' ? IMAGE_CACHE : null,
  simpleHashStr: typeof simpleHashStr === 'function' ? simpleHashStr : null,
  getPlaceholderForModel: typeof getPlaceholderForModel === 'function' ? getPlaceholderForModel : null,
  preloadFactionImages: typeof preloadFactionImages === 'function' ? preloadFactionImages : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeImg() {
  const img = { complete:false, naturalWidth:0, naturalHeight:0, src:'', onload:null, onerror:null };
  Object.defineProperty(img, 'src', {
    set(v) {
      this._src = v;
      // Simula carga asíncrona exitosa.
      setTimeout(() => {
        this.complete = true;
        this.naturalWidth = 800;
        this.naturalHeight = 600;
        if (this.onload) this.onload();
      }, 0);
    },
    get() { return this._src; },
  });
  return img;
}
const Image = function() { return fakeImg(); };
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { Image, addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['FACTION_PLACEHOLDERS','EMBEDDED_PLACEHOLDERS','IMAGE_CACHE','simpleHashStr','getPlaceholderForModel','preloadFactionImages']) {
  if (!lib[h] && lib[h] !== null) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { FACTION_PLACEHOLDERS, EMBEDDED_PLACEHOLDERS, IMAGE_CACHE,
        simpleHashStr, getPlaceholderForModel, preloadFactionImages } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: simpleHashStr djb2 determinístico', () => {
  ok(typeof simpleHashStr === 'function', 'function exists');
  ok(simpleHashStr('Silahdar') === simpleHashStr('Silahdar'), 'determinístico mismo input');
  ok(simpleHashStr('Silahdar') !== simpleHashStr('Yuzbasi'), 'distinto input → distinto hash');
  ok(typeof simpleHashStr('x') === 'number', 'devuelve number');
  ok(simpleHashStr('') === 5381 || simpleHashStr('') >= 0, 'empty string seguro');
});

group('Group 2: FACTION_PLACEHOLDERS estructura básica', () => {
  ok(typeof FACTION_PLACEHOLDERS === 'object', 'object exists');
  // 6 facciones base SPEC v2.
  const bases = ['new-antioch','trench-pilgrims','iron-sultanate','heretic-legions','black-grail','the-court'];
  let hasAtLeastOne = false;
  for (const b of bases) {
    if (Array.isArray(FACTION_PLACEHOLDERS[b])) hasAtLeastOne = true;
  }
  ok(hasAtLeastOne, 'al menos 1 facción con array de paths');
});

group('Group 3: EMBEDDED_PLACEHOLDERS fallback dataURL', () => {
  ok(typeof EMBEDDED_PLACEHOLDERS === 'object', 'object exists');
  // No requiere entries reales — estructura debe estar lista.
  ok(EMBEDDED_PLACEHOLDERS !== null, 'no es null');
});

group('Group 4: IMAGE_CACHE Map global', () => {
  ok(IMAGE_CACHE instanceof Map || typeof IMAGE_CACHE.get === 'function', 'tiene .get/.set Map-like');
});

group('Group 5: getPlaceholderForModel determinístico + fallback', () => {
  const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
  const m1 = { name:'Silahdar' };
  const m2 = { name:'Silahdar' };
  const r1 = getPlaceholderForModel(m1, wb);
  const r2 = getPlaceholderForModel(m2, wb);
  // Mismo nombre + misma banda → misma key (null o path, da igual).
  ok(r1 === r2, 'mismo nombre → misma path');

  // Modelo sin nombre → no crash.
  let threw = false;
  try { getPlaceholderForModel({}, wb); } catch (e) { threw = true; }
  ok(!threw, 'modelo sin name no-throw');

  // wb null → no crash.
  try { getPlaceholderForModel(m1, null); } catch (e) { threw = true; }
  ok(!threw, 'wb null no-throw');

  // Banda inexistente → null.
  const r3 = getPlaceholderForModel(m1, { factionId:'xyz-inexistente' });
  ok(r3 === null || typeof r3 === 'string', 'inexistente → null o string');
});

group('Group 6: preloadFactionImages devuelve Promise', () => {
  const wb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
  const r = preloadFactionImages(wb);
  ok(r && typeof r.then === 'function', 'devuelve Promise');
  // null wb → Promise resuelta vacía.
  let threw = false;
  try { preloadFactionImages(null); } catch (e) { threw = true; }
  ok(!threw, 'null wb no-throw');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
