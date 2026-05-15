/* Test sub-fase A: Court of the Seven-Headed Serpent — 7 Sins en sim
 *
 * Cada Sin produce flags/mods medibles en cada modelo de la banda al
 * pasar por applyVariantBonus. Aproximación coarse — auras se aplican
 * uniformemente a toda la banda en lugar de radio condicional.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_court_sins.js');
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

function mkBand() {
  return [
    { name:'Yoke Fiend', meleeDice: 0, rangedDice: -2, armour: 0,
      weapons: [{ name:'Yoke Claws', isRanged:false, range:0, diceMod:0, injuryDice:1, injuryMod:0, keywords:new Set(['CLEAVE']) }],
      keywords: new Set() },
    { name:'Desecrated Saint', meleeDice: 2, rangedDice: 0, armour: -2,
      weapons: [{ name:'Greatsword', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
      keywords: new Set(['ELITE','LEADER']) },
  ];
}

/* ------------------------------------------------------------------ */
group('Group 1: Sin Wrath — +1 melee dice mod', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-wrath');
  for (const m of band) {
    const meleeW = (m.weapons || []).find(w => !w.isRanged);
    ok(meleeW && meleeW.diceMod === 1, `${m.name}: melee weapon diceMod = 1`);
  }
});

group('Group 2: Sin Envy — BLOCK keyword', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-envy');
  for (const m of band) {
    ok(m.keywords.has('BLOCK'), `${m.name}: BLOCK keyword`);
  }
});

group('Group 3: Sin Lust — flag pierceArmour', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-lust');
  for (const m of band) {
    ok(m.pierceArmour === true, `${m.name}: pierceArmour flag`);
  }
});

group('Group 4: Sin Pride — flag auraBleed', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-pride');
  for (const m of band) {
    ok(m.auraBleed === true, `${m.name}: auraBleed flag`);
  }
});

group('Group 5: Sin Sloth — flag auraSloth', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-sloth');
  for (const m of band) {
    ok(m.auraSloth === true, `${m.name}: auraSloth flag`);
  }
});

group('Group 6: Sin Gluttony — flag auraGluttony', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-gluttony');
  for (const m of band) {
    ok(m.auraGluttony === true, `${m.name}: auraGluttony flag`);
  }
});

group('Group 7: Sin Greed — flag auraGreed (narrative)', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-greed');
  for (const m of band) {
    ok(m.auraGreed === true, `${m.name}: auraGreed flag`);
  }
});

group('Group 8: Idempotent — re-applying does not double bonus', () => {
  const band = mkBand();
  applyVariantBonus(band, 'court-serpent', 'sin-wrath');
  applyVariantBonus(band, 'court-serpent', 'sin-wrath');
  const meleeW = band[0].weapons.find(w => !w.isRanged);
  ok(meleeW.diceMod === 1, 'second call does not stack (still +1)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
