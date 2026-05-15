/* Test sub-fase C: Iron Sultanate variants en sim
 *
 * fidai-alamut: Cabal of Assassins. INFILTRATOR + flag assassin con
 * +1 injuryMod a melee (stab from shadows).
 * house-wisdom: Jabireans + Kavasses. Flag scholar, +1 rangedDice
 * (researched marksmanship).
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_is_var.js');
const moduleCode = js.slice(0, bootIdx) + `module.exports = { applyVariantBonus };`;
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
const { applyVariantBonus } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

function mkISBand() {
  return [
    { name:'Azeb', meleeDice: -1, rangedDice: 0, armour: 0,
      weapons:[{ name:'Jezzail', isRanged:true, range:18, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() },
               { name:'Dagger', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
      keywords:new Set() },
    { name:'Jabirean', meleeDice: 0, rangedDice: 1, armour: 0,
      weapons:[{ name:'Pistol', isRanged:true, range:12, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set(['PISTOL']) }],
      keywords:new Set(['ELITE']) },
  ];
}

/* ------------------------------------------------------------------ */
group('Group 1: Fida\'i of Alamut — INFILTRATOR + assassin', () => {
  const band = mkISBand();
  applyVariantBonus(band, 'iron-sultanate', 'fidai-alamut');
  for (const m of band) {
    ok(m.keywords.has('INFILTRATOR'), `${m.name}: INFILTRATOR keyword`);
    ok(m.assassin === true, `${m.name}: assassin flag`);
  }
});

group('Group 2: Fida\'i — melee +1 injuryMod (stab)', () => {
  const band = mkISBand();
  applyVariantBonus(band, 'iron-sultanate', 'fidai-alamut');
  const azeb = band[0];
  const dagger = azeb.weapons.find(w => !w.isRanged);
  ok(dagger.injuryMod === 1, 'Azeb dagger: injuryMod +1');
});

group('Group 3: House of Wisdom — scholar flag + rangedDice +1', () => {
  const band = mkISBand();
  applyVariantBonus(band, 'iron-sultanate', 'house-wisdom');
  for (const m of band) {
    ok(m.scholar === true, `${m.name}: scholar flag`);
    ok(m.rangedDice === (m._origRanged ?? m.rangedDice), 'rangedDice tracked');
  }
  // Verify dice mod applied
  const azeb = band[0];
  ok(azeb.rangedDice === 1, `Azeb rangedDice 0+1 = 1 (got ${azeb.rangedDice})`);
  ok(band[1].rangedDice === 2, `Jabirean rangedDice 1+1 = 2 (got ${band[1].rangedDice})`);
});

group('Group 4: Idempotent', () => {
  const band = mkISBand();
  applyVariantBonus(band, 'iron-sultanate', 'house-wisdom');
  applyVariantBonus(band, 'iron-sultanate', 'house-wisdom');
  ok(band[0].rangedDice === 1, 'second call: rangedDice stays 1');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
