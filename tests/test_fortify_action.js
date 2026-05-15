/* Test sub-fase E: Fortify ACTION (Combat Engineer) en sim
 *
 * attachFortifyAction(model): Combat Engineer gana canFortify=true.
 * consumeFortifyAction(model): marca fortified=true (única vez).
 * applyFortifyEffectToBand(band): si algún miembro tiene
 * fortified=true, setea bandFortified flag para que sim ranged
 * resolver lo consuma (-1 DICE enemy ranged → defendant +cover).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_fortify.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  attachFortifyAction: typeof attachFortifyAction === 'function' ? attachFortifyAction : null,
  consumeFortifyAction: typeof consumeFortifyAction === 'function' ? consumeFortifyAction : null,
  applyFortifyEffectToBand: typeof applyFortifyEffectToBand === 'function' ? applyFortifyEffectToBand : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null;
function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, getElementById(){return fakeEl();}, createElement(){return fakeEl();}, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
const { attachFortifyAction, consumeFortifyAction, applyFortifyEffectToBand } = lib;
if (!attachFortifyAction) { console.error('✗ attachFortifyAction missing'); process.exit(1); }
if (!consumeFortifyAction) { console.error('✗ consumeFortifyAction missing'); process.exit(1); }
if (!applyFortifyEffectToBand) { console.error('✗ applyFortifyEffectToBand missing'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: attach setea canFortify', () => {
  const m = { name:'Combat Engineer' };
  attachFortifyAction(m);
  ok(m.canFortify === true, 'canFortify flag');
});

group('Group 2: consume marca fortified única vez', () => {
  const m = { name:'Combat Engineer' };
  attachFortifyAction(m);
  ok(consumeFortifyAction(m) === true, '1ra → true');
  ok(m.fortified === true, 'fortified marcado');
  ok(consumeFortifyAction(m) === false, '2da → false');
});

group('Group 3: applyFortifyEffectToBand — sin nadie fortified', () => {
  const band = [{ name:'A' }, { name:'B' }];
  applyFortifyEffectToBand(band);
  ok(!band[0].bandFortified, 'no flag aplicado sin fortified miembro');
});

group('Group 4: applyFortifyEffectToBand — propaga bandFortified', () => {
  const eng = { name:'Combat Engineer' };
  attachFortifyAction(eng);
  consumeFortifyAction(eng);
  const band = [eng, { name:'Trooper' }, { name:'Trooper2' }];
  applyFortifyEffectToBand(band);
  for (const m of band) {
    ok(m.bandFortified === true, `${m.name}: bandFortified flag propagado`);
  }
});

group('Group 5: defensive', () => {
  let threw = false;
  try { attachFortifyAction(null); } catch (e) { threw = true; }
  ok(!threw, 'null attach no-throw');
  ok(consumeFortifyAction(null) === false, 'null consume → false');
  ok(consumeFortifyAction({}) === false, 'modelo sin canFortify → false');
  threw = false;
  try { applyFortifyEffectToBand(null); } catch (e) { threw = true; }
  ok(!threw, 'null band apply no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
