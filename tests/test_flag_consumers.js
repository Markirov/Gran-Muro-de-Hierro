/* Test flag-consumer helpers usados por resolvers del motor Lab.
 *
 * Extracción de la lógica que aplica flags en attacker/target durante
 * ranged + injury resolution. Cada helper es puro o quasi-puro
 * (muta el modelo) y fácilmente verificable en aislamiento.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_flags.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  consumeHungerOnKill: typeof consumeHungerOnKill === 'function' ? consumeHungerOnKill : null,
  applyPrideOnBlood: typeof applyPrideOnBlood === 'function' ? applyPrideOnBlood : null,
  applySlothMinorAsDown: typeof applySlothMinorAsDown === 'function' ? applySlothMinorAsDown : null,
  applyLustPierce: typeof applyLustPierce === 'function' ? applyLustPierce : null,
  applyGluttonyMalus: typeof applyGluttonyMalus === 'function' ? applyGluttonyMalus : null,
  applyFortifyMalus: typeof applyFortifyMalus === 'function' ? applyFortifyMalus : null,
  applySkipActivation: typeof applySkipActivation === 'function' ? applySkipActivation : null,
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
const helpers = ['consumeHungerOnKill','applyPrideOnBlood','applySlothMinorAsDown','applyLustPierce','applyGluttonyMalus','applyFortifyMalus','applySkipActivation'];
for (const h of helpers) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { consumeHungerOnKill, applyPrideOnBlood, applySlothMinorAsDown, applyLustPierce, applyGluttonyMalus, applyFortifyMalus, applySkipActivation } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: consumeHungerOnKill', () => {
  const hungryAttacker = { hungry:true, bloodMarkers:3 };
  consumeHungerOnKill(hungryAttacker);
  ok(hungryAttacker.bloodMarkers === 2, 'hungry: 3 → 2');

  const normal = { bloodMarkers:3 };
  consumeHungerOnKill(normal);
  ok(normal.bloodMarkers === 3, 'no hungry → sin cambio');

  const at0 = { hungry:true, bloodMarkers:0 };
  consumeHungerOnKill(at0);
  ok(at0.bloodMarkers === 0, 'hungry at 0 → no negativo');
});

group('Group 2: applyPrideOnBlood', () => {
  const target = { bloodMarkers:1 };
  const attacker = { bloodMarkerOnHit:true };
  applyPrideOnBlood(target, attacker);
  ok(target.bloodMarkers === 2, '+1 bloodMarker');

  const t2 = { bloodMarkers:1 };
  applyPrideOnBlood(t2, { });
  ok(t2.bloodMarkers === 1, 'attacker sin flag → sin cambio');

  const t3 = { bloodMarkers:6 };
  applyPrideOnBlood(t3, { bloodMarkerOnHit:true });
  ok(t3.bloodMarkers === 6, 'cap a 6');
});

group('Group 3: applySlothMinorAsDown', () => {
  ok(applySlothMinorAsDown('BLOOD', { minorHitsAsDown:true }) === 'DOWN', 'BLOOD + sloth → DOWN');
  ok(applySlothMinorAsDown('BLOOD', { }) === 'BLOOD', 'sin sloth → BLOOD');
  ok(applySlothMinorAsDown('DOWN', { minorHitsAsDown:true }) === 'DOWN', 'DOWN ya → DOWN');
  ok(applySlothMinorAsDown('OUT', { minorHitsAsDown:true }) === 'OUT', 'OUT ya → OUT');
  ok(applySlothMinorAsDown(null, { minorHitsAsDown:true }) === null, 'null preservado');
});

group('Group 4: applyLustPierce', () => {
  ok(applyLustPierce(false, { pierceArmour:true }) === true, 'pierce + bypass false → true');
  ok(applyLustPierce(true, { pierceArmour:true }) === true, 'pierce + bypass true → true');
  ok(applyLustPierce(false, { }) === false, 'no pierce + bypass false → false');
  ok(applyLustPierce(true, { }) === true, 'no pierce + bypass true → true');
});

group('Group 5: applyGluttonyMalus', () => {
  ok(applyGluttonyMalus(2, { enemyDiceMalus:1 }) === 1, 'diceMod 2 - 1 = 1');
  ok(applyGluttonyMalus(0, { }) === 0, 'sin target malus → diceMod sin cambio');
  ok(applyGluttonyMalus(3, { enemyDiceMalus:2 }) === 1, 'malus 2');
});

group('Group 6: applyFortifyMalus', () => {
  ok(applyFortifyMalus(2, { bandFortified:true }) === 1, 'diceMod 2 - 1 = 1');
  ok(applyFortifyMalus(2, { }) === 2, 'sin fortified → sin cambio');
});

group('Group 7: applySkipActivation', () => {
  const m = { skipNextActivation:true };
  ok(applySkipActivation(m) === true, 'flag presente → skip');
  ok(m.skipNextActivation === false, 'flag consumido tras skip');
  ok(applySkipActivation(m) === false, '2da → false (ya consumido)');
  ok(applySkipActivation({}) === false, 'modelo sin flag → false');
});

group('Group 8: defensive', () => {
  let threw = false;
  try { consumeHungerOnKill(null); } catch (e) { threw = true; }
  ok(!threw, 'null attacker no-throw');
  try { applyPrideOnBlood(null, {}); } catch (e) { threw = true; }
  ok(!threw, 'null target no-throw');
  try { applySkipActivation(null); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
