/* Sub-D + Sub-E: fallback nativo + equipment expand.
 *
 * Sub-D: buildModelCardData con modelo nativo (no companionRef)
 * lee stats del unit canon (DATA.factions[fid].units[i]) si unitId
 * resuelve. Si no, devuelve stats vacíos sin crash.
 *
 * Sub-E: EQUIPMENT_IMPLICIT_ABILITIES tiene más entradas que las 4
 * originales: Gas Mask, Field Shrine, Reinforced Armour, Combat
 * Helmet, Frag Grenade, etc.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_native_eq.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  buildModelCardData,
  EQUIPMENT_IMPLICIT_ABILITIES,
  getImplicitAbilities,
  DATA,
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
const { buildModelCardData, EQUIPMENT_IMPLICIT_ABILITIES, getImplicitAbilities, DATA } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Sub-D Group 1: modelo nativo con unitId canon resuelve stats', () => {
  // Pick faction with units that have stats
  const factionIds = Object.keys(DATA.factions);
  let unit = null, fid = null;
  for (const f of factionIds) {
    const u = (DATA.factions[f].units || []).find(u => u.stats);
    if (u) { unit = u; fid = f; break; }
  }
  if (!unit) { ok(false, 'fixture: no unit con stats'); return; }
  const wb = { factionId: fid };
  const m = { name: unit.name, unitId: unit.id };
  const data = buildModelCardData(m, wb);
  ok(data.stats.length === 5, '5 stats devueltos');
  // Verifica que algún stat tiene valor != '0' (es nativo, no companion)
  const hasRealStat = data.stats.some(s => s.value && s.value !== '0');
  ok(hasRealStat, `algún stat nativo no-cero (canon unit "${unit.name}")`);
});

group('Sub-D Group 2: modelo nativo sin unitId resoluble → stats vacíos no-crash', () => {
  const wb = { factionId: 'new-antioch' };
  const m = { name: 'Mystery', unitId: 'no-existe-este-id' };
  let threw = false;
  let data;
  try { data = buildModelCardData(m, wb); } catch (e) { threw = true; }
  ok(!threw, 'no-throw');
  ok(data && Array.isArray(data.stats), 'devuelve data con stats array');
});

group('Sub-E Group 3: EQUIPMENT_IMPLICIT_ABILITIES expandido', () => {
  // Originales 4 + nuevos
  const expected = ['Trench Shield', 'Binoculars', 'Alchemist Armour', 'Alchemical Ammunition',
                    'Gas Mask', 'Field Shrine', 'Reinforced Armour', 'Combat Helmet', 'Frag Grenade'];
  for (const item of expected) {
    ok(Array.isArray(EQUIPMENT_IMPLICIT_ABILITIES[item]),
       item + ' present in map');
  }
});

group('Sub-E Group 4: nuevos items tienen abilities con name+desc', () => {
  const newItems = ['Gas Mask', 'Field Shrine', 'Reinforced Armour', 'Combat Helmet', 'Frag Grenade'];
  for (const item of newItems) {
    const abs = EQUIPMENT_IMPLICIT_ABILITIES[item];
    if (!abs) continue;
    ok(abs.every(a => a.name && a.desc), item + ': abilities tienen name+desc');
  }
});

group('Sub-E Group 5: getImplicitAbilities aplica nuevos items', () => {
  const m = { companionEquipment: [{name:'Gas Mask'}] };
  const a = getImplicitAbilities(m);
  ok(a.length >= 1, 'Gas Mask devuelve ≥1 ability');
  ok(a.some(x => /gas/i.test(x.name || '') || /gas/i.test(x.desc || '')),
     'mencionan gas');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
