/* Test sub-fase B: Black Grail variants en sim
 *
 * Dirge of the Great Hegemon: aplica bonus a Plague Knights y Bereaved.
 * The Great Hunger: Antipope gana flag hungry que absorbe BLOOD MARKERS
 * propios al matar.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_bg_var.js');
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

function mkBGBand() {
  return [
    { name:'Plague Knight', meleeDice: 2, rangedDice: 0, armour: -1,
      weapons:[{ name:'Plague Mace', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
      keywords:new Set(['ELITE','PLAGUE']) },
    { name:'Bereaved Thrall', meleeDice: -1, rangedDice: -2, armour: 0,
      weapons:[{ name:'Pitchfork', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
      keywords:new Set(['BEREAVED']) },
    { name:'Antipope', meleeDice: 2, rangedDice: 1, armour: -2,
      weapons:[{ name:'Crozier', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords:new Set() }],
      keywords:new Set(['ELITE','LEADER']) },
  ];
}

/* ------------------------------------------------------------------ */
group('Group 1: Dirge — Plague Knights y Bereaved +1 INJURY MOD', () => {
  const band = mkBGBand();
  applyVariantBonus(band, 'black-grail', 'great-hegemon');
  const pk = band.find(m => /plague knight/i.test(m.name));
  const br = band.find(m => /bereaved/i.test(m.name));
  const ap = band.find(m => /antipope/i.test(m.name));
  const pkW = pk.weapons[0]; const brW = br.weapons[0]; const apW = ap.weapons[0];
  ok(pkW.injuryMod === 1, 'Plague Knight: injuryMod +1');
  ok(brW.injuryMod === 1, 'Bereaved: injuryMod +1');
  ok(apW.injuryMod === 0, 'Antipope: sin bonus (no PLAGUE ni BEREAVED)');
});

group('Group 2: Dirge — dirgeOfHegemon flag', () => {
  const band = mkBGBand();
  applyVariantBonus(band, 'black-grail', 'great-hegemon');
  for (const m of band) {
    ok(m._variantBonusApplied === 'great-hegemon', `${m.name}: idempotency tag set`);
  }
});

group('Group 3: Great Hunger — Antipope gana hungry flag', () => {
  const band = mkBGBand();
  applyVariantBonus(band, 'black-grail', 'great-hunger');
  const ap = band.find(m => /antipope/i.test(m.name));
  ok(ap.hungry === true, 'Antipope: hungry flag');
  ok(ap.bloodMarkerOnKill === true, 'Antipope: bloodMarkerOnKill flag');
});

group('Group 4: Great Hunger — non-Antipopes no reciben hungry', () => {
  const band = mkBGBand();
  applyVariantBonus(band, 'black-grail', 'great-hunger');
  const pk = band.find(m => /plague knight/i.test(m.name));
  ok(!pk.hungry, 'Plague Knight: no hungry flag');
});

group('Group 5: Idempotent', () => {
  const band = mkBGBand();
  applyVariantBonus(band, 'black-grail', 'great-hegemon');
  applyVariantBonus(band, 'black-grail', 'great-hegemon');
  const pkW = band.find(m => /plague knight/i.test(m.name)).weapons[0];
  ok(pkW.injuryMod === 1, 'no doble-stack al reaplicar');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
