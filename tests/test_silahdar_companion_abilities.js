/* Bug Cazadores del Muro — Silahdar pintaba abilities de Yüzbaşı (Mubarizun)
 * en PDF + UI por culpa del alias COMPANION_ID_ALIASES que mapea
 * 'md_yuzbasicaptain_mv_silahdar' → 'yuzbasi'.
 *
 * Filosofía PIVOT v2: Trench Companion es la verdad oficial. Cuando un
 * modelo viene de Companion (companionStats/companionAbilities presentes),
 * sus abilities canon vienen del JSON, no del fallback de Forge unit.
 *
 * Verifica el helper `displayAbilitiesForCard(model, unit)`:
 * - Companion present + unit alias incorrecto → solo companion abilities.
 * - Sin companion (native) → unit.abilities + upgrade.addsAbilities.
 * - Companion abilities normalizados (string o {name} objeto).
 * - Lista vacía si ambos missing.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_silahdar.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  displayAbilitiesForCard: typeof displayAbilitiesForCard === 'function' ? displayAbilitiesForCard : null,
  effectiveAbilities: typeof effectiveAbilities === 'function' ? effectiveAbilities : null,
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
for (const h of ['displayAbilitiesForCard','effectiveAbilities']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { displayAbilitiesForCard, effectiveAbilities } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: Silahdar con companion data NO incluye Mubarizun (canon)', () => {
  const silahdar = {
    name: 'Silahdar',
    unitId: 'yuzbasi',  // alias resuelve a yuzbasi (canon: silahdar)
    companionStats: { move: '6"/Infantry', melee: '+2', ranged: '+2', armour: '-3' },
    companionAbilities: [
      { name: 'Siege Jezzail Teams' },
      { name: 'Marksmanship of the Iron Wall' },
    ],
  };
  const unitYuzbasi = {
    id: 'yuzbasi',
    name: 'Yüzbaşı',
    abilities: ['Mubarizun'],  // canon yuzbasi
    upgrades: [],
  };
  const out = displayAbilitiesForCard(silahdar, unitYuzbasi);
  ok(Array.isArray(out), 'devuelve array');
  ok(out.some(a => /Siege Jezzail/i.test(a.name || a)), 'incluye Siege Jezzail Teams');
  ok(out.some(a => /Marksmanship/i.test(a.name || a)), 'incluye Marksmanship of the Iron Wall');
  ok(!out.some(a => /Mubarizun/i.test(a.name || a)),
     'NO incluye Mubarizun (sale de yuzbasi, no aplica a Silahdar)');
});

group('Group 2: Janissary Officer con companion data NO mezcla Janissaries', () => {
  const officer = {
    name: 'Janissary Officer',
    unitId: 'janissaries',
    companionStats: { move: '6"', melee: '+1', ranged: '+1', armour: '-3' },
    companionAbilities: [
      { name: 'Counter-Charge' },
      { name: 'Siege Jezzail Teams' },
      { name: 'Marksmanship of the Iron Wall' },
    ],
  };
  const unitJani = {
    id: 'janissaries',
    name: 'Janissaries',
    abilities: ['Counter-Charge'],  // base canon Janissary
    upgrades: [],
  };
  const out = displayAbilitiesForCard(officer, unitJani);
  ok(out.some(a => /Counter-Charge/i.test(a.name || a)), 'incluye Counter-Charge');
  ok(out.some(a => /Marksmanship/i.test(a.name || a)),
     'incluye Marksmanship of the Iron Wall (canon variant rule)');
});

group('Group 3: modelo nativo (sin companion) usa unit.abilities + upgrades', () => {
  const native = {
    name: 'Yüzbaşí Veterano',
    unitId: 'yuzbasi',
    upgrades: ['veteran'],
  };
  const unitYuzbasi = {
    id: 'yuzbasi',
    name: 'Yüzbaşí',
    abilities: ['Mubarizun'],
    upgrades: [
      { id: 'veteran', addsAbilities: ['Counter-Charge'] },
    ],
  };
  const out = displayAbilitiesForCard(native, unitYuzbasi);
  ok(out.some(a => /Mubarizun/i.test(a.name || a)), 'incluye Mubarizun');
  ok(out.some(a => /Counter-Charge/i.test(a.name || a)),
     'incluye Counter-Charge del upgrade activo');
});

group('Group 4: companion abilities strings + objetos normalizan a {name}', () => {
  const mixed = {
    name: 'Mixed',
    unitId: 'x',
    companionStats: { move: '6"' },
    companionAbilities: [
      'String Ability',
      { name: 'Object Ability' },
      { 'ability-name': 'Companion JSON shape' },  // Companion exporta este shape
    ],
  };
  const unit = { id: 'x', abilities: [], upgrades: [] };
  const out = displayAbilitiesForCard(mixed, unit);
  const names = out.map(a => a.name || a);
  ok(names.includes('String Ability'), 'normaliza string a name');
  ok(names.includes('Object Ability'), 'preserva {name} object');
  ok(names.includes('Companion JSON shape'),
     'reconoce shape Companion JSON {ability-name}');
});

group('Group 5: ambos vacíos → lista vacía', () => {
  const empty = { name: 'X', unitId: 'y' };
  const unit = { id: 'y', abilities: [], upgrades: [] };
  const out = displayAbilitiesForCard(empty, unit);
  ok(Array.isArray(out) && out.length === 0, 'lista vacía cuando todo missing');
});

group('Group 6: unit null no-throw', () => {
  const m = { name: 'X', companionAbilities: ['A'] };
  let threw = false;
  let out;
  try { out = displayAbilitiesForCard(m, null); } catch (e) { threw = true; }
  ok(!threw, 'no-throw con unit=null');
  ok(Array.isArray(out) && out.length === 1, 'devuelve companion ability');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
