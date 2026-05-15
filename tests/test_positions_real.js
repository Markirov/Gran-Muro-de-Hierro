/* Test positions reales en Lab simulator.
 *
 * Plumbing geométrico mínimo:
 * - deployBands(bandA, bandB, opts?): asigna _pos {x, y} a cada
 *   modelo. Tabletop default 48"x32" (canon TC). Bandas en extremos
 *   opuestos, spread Y random.
 * - distance(a, b): euclidean entre dos modelos.
 * - findCAClustersReal(leadModel, allies, weaponName): array de
 *   modelos a 2" del lead que llevan weapon con same name (canon
 *   exige misma arma).
 * - applyConcentratedAttackReal(band, opts): por cada potencial
 *   lead, ve si tiene cluster CA real. Aplica bonus.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_pos.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  deployBands: typeof deployBands === 'function' ? deployBands : null,
  distance: typeof distance === 'function' ? distance : null,
  findCAClustersReal: typeof findCAClustersReal === 'function' ? findCAClustersReal : null,
  applyConcentratedAttackReal: typeof applyConcentratedAttackReal === 'function' ? applyConcentratedAttackReal : null,
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
for (const h of ['deployBands','distance','findCAClustersReal','applyConcentratedAttackReal']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { deployBands, distance, findCAClustersReal, applyConcentratedAttackReal } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mk(name, w) {
  return {
    name,
    rangedDice: 1,
    weapons: w ? [{ name: w, isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] : [],
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: deployBands asigna _pos válido', () => {
  const A = [mk('a1','Bolt'), mk('a2','Bolt'), mk('a3','Pistol')];
  const B = [mk('b1','Rifle'), mk('b2','Rifle')];
  deployBands(A, B);
  for (const m of A) {
    ok(m._pos && typeof m._pos.x === 'number' && typeof m._pos.y === 'number', `${m.name}: _pos asignado`);
  }
  for (const m of B) {
    ok(m._pos && typeof m._pos.x === 'number', `${m.name}: _pos asignado`);
  }
});

group('Group 2: deployBands — bandas en extremos opuestos', () => {
  const A = [mk('a','Bolt')];
  const B = [mk('b','Bolt')];
  deployBands(A, B);
  ok(A[0]._pos.x < 16, `A spawn izquierda (x=${A[0]._pos.x.toFixed(1)})`);
  ok(B[0]._pos.x > 32, `B spawn derecha (x=${B[0]._pos.x.toFixed(1)})`);
});

group('Group 3: distance euclidean', () => {
  const a = { _pos: { x: 0, y: 0 } };
  const b = { _pos: { x: 3, y: 4 } };
  ok(distance(a, b) === 5, 'dist (0,0)→(3,4) = 5');
  const c = { _pos: { x: 0, y: 0 } };
  ok(distance(a, c) === 0, 'mismo punto = 0');
  ok(distance(null, b) === Infinity, 'null → Infinity');
});

group('Group 4: findCAClustersReal — solo dentro 2"', () => {
  const lead = mk('lead','Bolt');
  lead._pos = { x: 10, y: 10 };
  const close = mk('close','Bolt');
  close._pos = { x: 11, y: 10 };  // dist=1
  const closeWrong = mk('closeWrong','Rifle');
  closeWrong._pos = { x: 11, y: 11 };  // dist≈1.4 but diff weapon
  const far = mk('far','Bolt');
  far._pos = { x: 15, y: 10 };  // dist=5
  const allies = [lead, close, closeWrong, far];
  const cluster = findCAClustersReal(lead, allies, 'Bolt');
  ok(cluster.includes(lead), 'lead incluido');
  ok(cluster.includes(close), 'close (1") con same weapon → incluido');
  ok(!cluster.includes(closeWrong), 'closeWrong (1.4") con diff weapon → excluido');
  ok(!cluster.includes(far), 'far (5") → excluido');
});

group('Group 5: applyConcentratedAttackReal — bonus por proximity real', () => {
  const lead = mk('lead','Bolt'); lead._pos = { x: 10, y: 10 };
  const friend = mk('friend','Bolt'); friend._pos = { x: 11, y: 10 };
  const farfriend = mk('far','Bolt'); farfriend._pos = { x: 20, y: 10 };
  const band = [lead, friend, farfriend];
  applyConcentratedAttackReal(band);
  // lead y friend coordinan (dist 1"). farfriend solo (>2" del lead, >2" del friend).
  ok(lead.rangedDice === 2, `lead 1+1 = 2 (got ${lead.rangedDice})`);
  ok(friend.rangedDice === 2, `friend 1+1 = 2 (got ${friend.rangedDice})`);
  ok(farfriend.rangedDice === 1, `farfriend solo → 1 (got ${farfriend.rangedDice})`);
});

group('Group 6: applyConcentratedAttackReal — cluster grande', () => {
  // 4 modelos same Bolt, todos cluster radio 2".
  const band = [
    Object.assign(mk('a','Bolt'), { _pos: { x: 10, y: 10 } }),
    Object.assign(mk('b','Bolt'), { _pos: { x: 11, y: 10 } }),
    Object.assign(mk('c','Bolt'), { _pos: { x: 10, y: 11 } }),
    Object.assign(mk('d','Bolt'), { _pos: { x: 11, y: 11 } }),
  ];
  applyConcentratedAttackReal(band);
  // cada modelo recibe +3 (cluster de 4, bonus 3)
  for (const m of band) {
    ok(m.rangedDice === 4, `${m.name} 1+3 = 4 (got ${m.rangedDice})`);
  }
});

group('Group 7: defensive', () => {
  ok(distance({}, {}) === Infinity, 'missing _pos → Infinity');
  ok(Array.isArray(findCAClustersReal(null, [], 'X')), 'null lead → array');
  ok(findCAClustersReal(null, [], 'X').length === 0, 'null lead → empty');
  let threw = false;
  try { applyConcentratedAttackReal(null); } catch (e) { threw = true; }
  ok(!threw, 'null band no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
