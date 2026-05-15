/* Test sub-fase G: Concentrated Attack positional approximation
 *
 * Sin posiciones reales el Lab nunca podrá ser canon-exacto. Pero
 * podemos refinar la aproximación uniforme a una por-grupo-de-arma:
 * solo modelos que comparten arma a Distancia con ≥1 más reciben el
 * bonus, y el tamaño del bonus es min(max, groupSize-1).
 *
 * applyConcentratedAttackPositional(band, opts): mutator. Por grupo
 * de arma con ≥2 modelos, aplica bonus rangedDice. Devuelve array
 * de { weaponName, count, bonus } para reporting.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_ca_pos.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  applyConcentratedAttackPositional: typeof applyConcentratedAttackPositional === 'function' ? applyConcentratedAttackPositional : null,
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
const { applyConcentratedAttackPositional } = lib;
if (!applyConcentratedAttackPositional) {
  console.error('✗ helper missing'); process.exit(1);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(name, weaponName, rangedDice) {
  return {
    name,
    rangedDice,
    weapons: weaponName ? [{
      name: weaponName, isRanged: true, range: 24, diceMod: 0,
      injuryDice: 0, injuryMod: 0, keywords: new Set(),
    }] : [],
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: 3 modelos misma arma → bonus a los 3', () => {
  const band = [
    mkModel('A', 'Bolt-Action Rifle', 1),
    mkModel('B', 'Bolt-Action Rifle', 1),
    mkModel('C', 'Bolt-Action Rifle', 1),
    mkModel('D', 'Pistol', 0),
  ];
  const report = applyConcentratedAttackPositional(band);
  // groupSize=3 → bonus = min(4, 2) = 2 a los 3 modelos con Bolt.
  ok(band[0].rangedDice === 3, 'A 1+2 = 3');
  ok(band[1].rangedDice === 3, 'B 1+2 = 3');
  ok(band[2].rangedDice === 3, 'C 1+2 = 3');
  // D tiene Pistol solo (grupo de 1) — no bonus.
  ok(band[3].rangedDice === 0, 'D pistol solo → no bonus');
  const bolt = report.find(r => /Bolt-Action Rifle/i.test(r.weaponName));
  ok(bolt && bolt.count === 3 && bolt.bonus === 2, 'report Bolt group correct');
});

group('Group 2: 1 modelo solo en arma → no bonus', () => {
  const band = [
    mkModel('A', 'Sniper Rifle', 2),
    mkModel('B', 'Bolt-Action Rifle', 1),
  ];
  applyConcentratedAttackPositional(band);
  ok(band[0].rangedDice === 2, 'A sniper solo → no bonus');
  ok(band[1].rangedDice === 1, 'B rifle solo → no bonus');
});

group('Group 3: cap por opts.max', () => {
  const band = [
    mkModel('A', 'Bolt', 1),
    mkModel('B', 'Bolt', 1),
    mkModel('C', 'Bolt', 1),
    mkModel('D', 'Bolt', 1),
    mkModel('E', 'Bolt', 1),
    mkModel('F', 'Bolt', 1),
  ];
  applyConcentratedAttackPositional(band, { max: 2 });
  // groupSize=6 → bonus = min(2, 5) = 2
  for (const m of band) {
    ok(m.rangedDice === 3, `${m.name}: 1+2 = 3 (capped)`);
  }
});

group('Group 4: modelos sin arma a Distancia ignorados', () => {
  const band = [
    { name:'A', rangedDice: -2, weapons: [{ name:'Trench Club', isRanged:false }] },
    mkModel('B', 'Bolt', 1),
    mkModel('C', 'Bolt', 1),
  ];
  applyConcentratedAttackPositional(band);
  ok(band[0].rangedDice === -2, 'A melee-only: rangedDice intacto');
  ok(band[1].rangedDice === 2, 'B 1+1 = 2');
});

group('Group 5: defensive', () => {
  ok(Array.isArray(applyConcentratedAttackPositional(null)), 'null band → array');
  ok(applyConcentratedAttackPositional(null).length === 0, 'null band → empty report');
  ok(applyConcentratedAttackPositional([]).length === 0, 'empty band → empty');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
