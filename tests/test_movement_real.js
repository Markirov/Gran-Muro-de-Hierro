/* Sub-B: movement entre fases.
 * moveTowardClosest(model, enemies, maxMove): mutador que mueve
 * model._pos hacia el enemy alive más cercano, hasta maxMove pulgadas.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_move.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  moveTowardClosest: typeof moveTowardClosest === 'function' ? moveTowardClosest : null,
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
if (!lib.moveTowardClosest) { console.error('✗ moveTowardClosest missing'); process.exit(1); }
const { moveTowardClosest } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: move hacia closest', () => {
  const m = { _pos: {x: 0, y: 0} };
  const e1 = { _pos: {x: 10, y: 0}, isOut: false };
  const e2 = { _pos: {x: 100, y: 0}, isOut: false };
  moveTowardClosest(m, [e1, e2], 5);
  ok(m._pos.x === 5, 'x avanzó 5 hacia closest (e1)');
  ok(m._pos.y === 0, 'y sin cambio');
});

group('Group 2: si maxMove > dist, llega exacto a 1" (canon stop)', () => {
  const m = { _pos: {x: 0, y: 0} };
  const e = { _pos: {x: 3, y: 0}, isOut: false };
  moveTowardClosest(m, [e], 10);
  // Canon: para evitar overlap, stops a 1" del enemy. dist 3" - 1" = 2" recorridos.
  ok(Math.abs(m._pos.x - 2) < 0.1, `x ≈ 2 (got ${m._pos.x})`);
});

group('Group 3: skip enemies isOut', () => {
  const m = { _pos: {x: 0, y: 0} };
  const eDead = { _pos: {x: 5, y: 0}, isOut: true };
  const eAlive = { _pos: {x: 20, y: 0}, isOut: false };
  moveTowardClosest(m, [eDead, eAlive], 6);
  // Closest alive = eAlive a 20. Mueve 6 hacia él.
  ok(m._pos.x === 6, `move hacia alive (got ${m._pos.x})`);
});

group('Group 4: sin enemies alive → no move', () => {
  const m = { _pos: {x: 0, y: 0} };
  moveTowardClosest(m, [{ _pos:{x:10,y:0}, isOut:true }], 6);
  ok(m._pos.x === 0, 'sin alive → no move');
});

group('Group 5: sin _pos en model → no-throw', () => {
  let threw = false;
  try { moveTowardClosest({}, [{ _pos:{x:5,y:0}, isOut:false }], 6); }
  catch (e) { threw = true; }
  ok(!threw, 'model sin _pos → no-throw');
});

group('Group 6: diagonal move', () => {
  const m = { _pos: {x: 0, y: 0} };
  const e = { _pos: {x: 30, y: 40}, isOut: false };  // dist 50
  moveTowardClosest(m, [e], 10);
  // Normalized dir (30/50, 40/50) = (0.6, 0.8). 10 * dir = (6, 8).
  ok(Math.abs(m._pos.x - 6) < 0.1, `x ≈ 6 (got ${m._pos.x})`);
  ok(Math.abs(m._pos.y - 8) < 0.1, `y ≈ 8 (got ${m._pos.y})`);
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
