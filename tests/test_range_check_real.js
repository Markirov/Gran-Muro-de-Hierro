/* Sub-A: range check en resolveRanged_lab usando _pos.
 *
 * Cuando attacker y target tienen _pos asignados (mode 'real' activo),
 * resolveRanged_lab debe omitir el ataque si target está fuera del
 * range del arma. Back-compat: si no hay _pos, ignora el check.
 *
 * Test: helper puro isWithinWeaponRange(attacker, target, weapon).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_range.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  isWithinWeaponRange: typeof isWithinWeaponRange === 'function' ? isWithinWeaponRange : null,
  distance,
};
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
if (!lib.isWithinWeaponRange) { console.error('✗ isWithinWeaponRange missing'); process.exit(1); }
const { isWithinWeaponRange } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: dentro del range → true', () => {
  const a = { _pos:{x:0,y:0} };
  const t = { _pos:{x:10,y:0} };
  ok(isWithinWeaponRange(a, t, {range: 24}) === true, '10" dist + 24" range → true');
});

group('Group 2: fuera del range → false', () => {
  const a = { _pos:{x:0,y:0} };
  const t = { _pos:{x:30,y:0} };
  ok(isWithinWeaponRange(a, t, {range: 24}) === false, '30" dist + 24" range → false');
});

group('Group 3: justo en el límite → true', () => {
  const a = { _pos:{x:0,y:0} };
  const t = { _pos:{x:24,y:0} };
  ok(isWithinWeaponRange(a, t, {range: 24}) === true, '24" dist + 24" range → true');
});

group('Group 4: sin _pos → true (back-compat)', () => {
  ok(isWithinWeaponRange({}, {}, {range: 12}) === true, 'sin _pos → permite (back-compat)');
  ok(isWithinWeaponRange({_pos:{x:0,y:0}}, {}, {range: 12}) === true, 'target sin _pos → permite');
});

group('Group 5: weapon sin range → true', () => {
  const a = {_pos:{x:0,y:0}};
  const t = {_pos:{x:100,y:0}};
  ok(isWithinWeaponRange(a, t, {}) === true, 'weapon sin range → permite');
  ok(isWithinWeaponRange(a, t, null) === true, 'weapon null → permite');
});

group('Group 6: range typeof string (e.g. "24\\"") parsea', () => {
  const a = {_pos:{x:0,y:0}};
  const t = {_pos:{x:10,y:0}};
  ok(isWithinWeaponRange(a, t, {range: '24"'}) === true, 'range "24\\"" parsea como 24');
  const tFar = {_pos:{x:30,y:0}};
  ok(isWithinWeaponRange(a, tFar, {range: '24"'}) === false, 'range "24\\"" 30" → false');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
