/* Test: Eye of Beelzebub trigger en activateModel_lab.
 *
 * Antipope con eye attached + eyeUsed=false dispara con weapon Eye
 * (5 DICE, BLAST 3", FIRE, IGNORE ARMOUR, IGNORE COVER) en su 1ra
 * activación con LoS. Flag consumido. Fallback a arma normal cuando
 * ya usado o phase=engagement.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_eye_wire.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  activateModel_lab,
  attachEyeOfBeelzebub,
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
const { activateModel_lab, attachEyeOfBeelzebub } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkModel(name) {
  return {
    name,
    isOut: false, isDown: false, bloodMarkers: 0,
    rangedDice: 1, meleeDice: 1, armour: 0,
    weapons: [{ name:'Crozier', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
    keywords: new Set(),
    _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
    _terrain: 'mixed',
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: Antipope con Eye dispara → eyeUsed=true en mid phase', () => {
  const ap = mkModel('Antipope');
  attachEyeOfBeelzebub(ap);
  const enemy = mkModel('Enemy');
  enemy.armour = -2;
  activateModel_lab(ap, [ap], [enemy], 'mid');
  ok(ap.eyeUsed === true, 'eyeUsed marcado tras disparar');
  ok(ap._stats.eyeFired === 1, '_stats.eyeFired = 1');
});

group('Group 2: Eye ya usado → fallback normal (NO re-fire)', () => {
  const ap = mkModel('Antipope');
  attachEyeOfBeelzebub(ap);
  ap.eyeUsed = true;  // ya consumido
  const enemy = mkModel('Enemy');
  activateModel_lab(ap, [ap], [enemy], 'mid');
  ok(!ap._stats.eyeFired || ap._stats.eyeFired === 0, 'no fire counter (Eye ya usado)');
});

group('Group 3: engagement phase → no Eye fire', () => {
  const ap = mkModel('Antipope');
  attachEyeOfBeelzebub(ap);
  const enemy = mkModel('Enemy');
  activateModel_lab(ap, [ap], [enemy], 'engagement');
  ok(!ap._stats.eyeFired || ap._stats.eyeFired === 0, 'engagement no fire');
  ok(ap.eyeUsed === false, 'eyeUsed sigue false (no consumido)');
});

group('Group 4: modelo sin Eye attached → ignora', () => {
  const m = mkModel('Trooper');
  const enemy = mkModel('Enemy');
  activateModel_lab(m, [m], [enemy], 'mid');
  ok(!m._stats.eyeFired, 'no fire en non-Antipope');
});

group('Group 5: Eye consume 1x — segundo activate falla', () => {
  const ap = mkModel('Antipope');
  attachEyeOfBeelzebub(ap);
  const enemy = mkModel('Enemy');
  activateModel_lab(ap, [ap], [enemy], 'mid');
  const fired1 = ap._stats.eyeFired === 1;
  activateModel_lab(ap, [ap], [enemy], 'mid');
  ok(fired1, '1ra: fired');
  ok(ap._stats.eyeFired === 1, '2da: counter sin cambio (ya consumido)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
