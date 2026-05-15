/* Test Opt 2 finalmente posible: applyConcentratedAttackClustered.
 *
 * Mejor aproximación posible sin posiciones reales. Sobre positional
 * (que agrupa por weapon name + asume todos coordinan), clustered
 * añade probabilidad: modelos del mismo weapon name pueden NO
 * coordinar (clusters menores que el grupo total). Modela la realidad
 * canon: a veces sí, a veces no, según la composición de la banda.
 *
 * Implementación: agrupar por weapon name → para cada grupo, sortear
 * fragmentación en sub-clusters de tamaño ~2-N. Aplicar bonus per
 * cluster.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_ca_clustered.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  applyConcentratedAttackClustered: typeof applyConcentratedAttackClustered === 'function' ? applyConcentratedAttackClustered : null,
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
const { applyConcentratedAttackClustered } = lib;
if (!applyConcentratedAttackClustered) {
  console.error('✗ applyConcentratedAttackClustered missing'); process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(name, weaponName, rangedDice) {
  return {
    name, rangedDice,
    weapons: weaponName ? [{
      name: weaponName, isRanged: true, range: 24, diceMod: 0,
      injuryDice: 0, injuryMod: 0, keywords: new Set(),
    }] : [],
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: 5 modelos misma arma → clusters de 2-5', () => {
  // Run many trials, verify the bonus distribution varies across runs.
  const bonuses = new Set();
  for (let i = 0; i < 50; i++) {
    const band = [
      mkModel('A', 'Bolt', 1), mkModel('B', 'Bolt', 1),
      mkModel('C', 'Bolt', 1), mkModel('D', 'Bolt', 1),
      mkModel('E', 'Bolt', 1),
    ];
    applyConcentratedAttackClustered(band);
    // Track total bonus (sum diff from original 1)
    const totalBonus = band.reduce((s, m) => s + (m.rangedDice - 1), 0);
    bonuses.add(totalBonus);
  }
  ok(bonuses.size >= 2, `varianza observada (got ${bonuses.size} distinct totals)`);
});

group('Group 2: 1 modelo solo en arma → no bonus', () => {
  const band = [mkModel('A', 'Sniper', 2), mkModel('B', 'Rifle', 1)];
  applyConcentratedAttackClustered(band);
  ok(band[0].rangedDice === 2, 'A sniper solo → no cambio');
  ok(band[1].rangedDice === 1, 'B rifle solo → no cambio');
});

group('Group 3: opts.max cap por cluster', () => {
  // 5 modelos same weapon, max=1 → cada cluster bonifica ≤1 extra
  const totals = [];
  for (let i = 0; i < 20; i++) {
    const band = [
      mkModel('A', 'Bolt', 1), mkModel('B', 'Bolt', 1),
      mkModel('C', 'Bolt', 1), mkModel('D', 'Bolt', 1),
      mkModel('E', 'Bolt', 1),
    ];
    applyConcentratedAttackClustered(band, { max: 1 });
    totals.push(band.reduce((s, m) => s + (m.rangedDice - 1), 0));
  }
  // cada model en cluster recibe ≤1, total bonus ≤ band.length=5
  ok(totals.every(t => t <= 5), `total bonus ≤ 5 per band (got max ${Math.max(...totals)})`);
});

group('Group 4: defensive', () => {
  ok(applyConcentratedAttackClustered(null) === undefined || Array.isArray(applyConcentratedAttackClustered(null)),
     'null band no-throw');
  let threw = false;
  try { applyConcentratedAttackClustered([]); } catch (e) { threw = true; }
  ok(!threw, 'empty band no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
