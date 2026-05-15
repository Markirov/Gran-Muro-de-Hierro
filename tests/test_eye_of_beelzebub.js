/* Test sub-fase D: Eye of Beelzebub en sim
 *
 * attachEyeOfBeelzebub(model): añade weapon Eye of Beelzebub al
 * Antipope (5 DICE Ranged 24" BLAST+FIRE+IGNORE ARMOUR+IGNORE COVER)
 * y setea flag eyeUsed=false para consumo 1x partida en phase.
 *
 * consumeEyeOfBeelzebub(model): true si quedaba, marca usado.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_eye.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  attachEyeOfBeelzebub: typeof attachEyeOfBeelzebub === 'function' ? attachEyeOfBeelzebub : null,
  consumeEyeOfBeelzebub: typeof consumeEyeOfBeelzebub === 'function' ? consumeEyeOfBeelzebub : null,
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
const { attachEyeOfBeelzebub, consumeEyeOfBeelzebub } = lib;
if (!attachEyeOfBeelzebub) { console.error('✗ attachEyeOfBeelzebub not exported'); process.exit(1); }
if (!consumeEyeOfBeelzebub) { console.error('✗ consumeEyeOfBeelzebub not exported'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: attach añade weapon Eye', () => {
  const m = { name:'Antipope', weapons:[{ name:'Crozier', isRanged:false }] };
  attachEyeOfBeelzebub(m);
  ok(m.weapons.length === 2, 'weapon count 2');
  const eye = m.weapons.find(w => /eye of beelzebub/i.test(w.name));
  ok(!!eye, 'Eye weapon present');
  ok(eye.isRanged === true, 'ranged');
  ok(eye.range === 24, 'range 24');
  ok(eye.keywords.has('BLAST 3"'), 'BLAST 3"');
  ok(eye.keywords.has('FIRE'), 'FIRE');
  ok(eye.keywords.has('IGNORE ARMOUR'), 'IGNORE ARMOUR');
  ok(eye.keywords.has('IGNORE COVER'), 'IGNORE COVER');
});

group('Group 2: attach marca flag eyeUsed=false', () => {
  const m = { name:'Antipope', weapons:[] };
  attachEyeOfBeelzebub(m);
  ok(m.eyeUsed === false, 'eyeUsed flag = false (disponible)');
});

group('Group 3: consume devuelve true 1ra vez', () => {
  const m = { name:'Antipope', weapons:[] };
  attachEyeOfBeelzebub(m);
  ok(consumeEyeOfBeelzebub(m) === true, '1ra consumición devuelve true');
  ok(m.eyeUsed === true, 'flag marcado usado');
});

group('Group 4: consume devuelve false 2da vez', () => {
  const m = { name:'Antipope', weapons:[] };
  attachEyeOfBeelzebub(m);
  consumeEyeOfBeelzebub(m);
  ok(consumeEyeOfBeelzebub(m) === false, '2da consumición devuelve false');
});

group('Group 5: idempotent attach — no duplica weapon', () => {
  const m = { name:'Antipope', weapons:[{ name:'Crozier', isRanged:false }] };
  attachEyeOfBeelzebub(m);
  attachEyeOfBeelzebub(m);
  const eyes = m.weapons.filter(w => /eye of beelzebub/i.test(w.name));
  ok(eyes.length === 1, 'solo 1 Eye weapon tras 2 attaches');
});

group('Group 6: defensive', () => {
  let threw = false;
  try { attachEyeOfBeelzebub(null); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
  ok(consumeEyeOfBeelzebub(null) === false, 'null model → false');
  ok(consumeEyeOfBeelzebub({}) === false, 'modelo sin eyeUsed → false');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
