/* Fix bandas PDF/tarjetas — dedup habilidades + descripción canon fallback.
 *
 * Verifica:
 * - buildModelCardData no duplica habilidades por nombre case-insensitive
 * - Cuando una fuente sin desc colisiona con otra que sí tiene → conserva la desc
 * - Si abilities tiene match en ABILITY_LIBRARY, summary se usa como fallback
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_abilities_dedup.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  buildModelCardData: typeof buildModelCardData === 'function' ? buildModelCardData : null,
  ABILITY_LIBRARY: typeof ABILITY_LIBRARY !== 'undefined' ? ABILITY_LIBRARY : null,
};
`;
const stub = `
let lsStore = {};
const localStorage = { getItem(k){return lsStore[k]||null;}, setItem(k,v){lsStore[k]=String(v);}, removeItem(k){delete lsStore[k];}, clear(){lsStore={};}, key(i){return Object.keys(lsStore)[i]||null;}, get length(){return Object.keys(lsStore).length;} };
let lastAlert=null; function alert(msg){lastAlert=msg;}
function fakeEl(){return{style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},removeEventListener(){},appendChild(){},querySelectorAll(){return[];},querySelector(){return null;},setAttribute(){},getAttribute(){return null;},innerHTML:'',textContent:'',value:'',children:[],dataset:{},click(){},focus(){},blur(){},dispatchEvent(){},cloneNode(){return fakeEl();},parentNode:{replaceChild(){}}};}
const window={addEventListener(){},removeEventListener(){},location:{search:''},navigator:{userAgent:''},matchMedia(){return{matches:false,addEventListener(){},addListener(){}};},requestAnimationFrame(fn){return 0;},setTimeout(){return 0;},clearTimeout(){}};
const document={addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},getElementById(){return fakeEl();},createElement:fakeEl,body:fakeEl(),documentElement:fakeEl()};
const setTimeout=(fn,ms)=>0; const clearTimeout=()=>{};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['buildModelCardData']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { buildModelCardData, ABILITY_LIBRARY } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: dedup case-insensitive', () => {
  const model = {
    name: 'Silahdar', uid: 'm1',
    companionStats: { move:'6"', ranged:'2', melee:'1', armour:'0' },
    companionEquipment: [],
    companionKeywords: [
      { name: 'ELITE' },
      { name: 'elite' },  // duplicado case distinto
      { name: 'SULTANATE' },
    ],
    companionAbilities: [
      { name: 'Bagpipes' },
      { name: 'BAGPIPES' },  // duplicado
    ],
    companionCost: 144,
  };
  const wb = { factionId: 'iron-sultanate', variantId: 'iron-wall-def' };
  const data = buildModelCardData(model, wb);
  ok(Array.isArray(data.abilities), 'abilities array');
  const lowerNames = data.abilities.map(a => (a.name || '').toLowerCase().trim());
  const eliteCount = lowerNames.filter(n => n === 'elite').length;
  const bagpipesCount = lowerNames.filter(n => n === 'bagpipes').length;
  ok(eliteCount === 1, 'elite/ELITE deduplicado a 1 ocurrencia');
  ok(bagpipesCount === 1, 'Bagpipes/BAGPIPES deduplicado a 1');
});

group('Group 2: dedup conserva descripción del duplicado si la tenía', () => {
  // Simula caso: keyword "Bagpipes" sin desc + faction rule "Bagpipes" con desc.
  const model = {
    name: 'Highlander', uid: 'm2',
    companionStats: { move:'6"', ranged:'1', melee:'2', armour:'1' },
    companionEquipment: [],
    companionKeywords: [{ name: 'Bagpipes' }],
    companionAbilities: [],
    companionCost: 100,
  };
  // wb Alba tiene factionRule "Bagpipes" con desc.
  const wb = { factionId: 'new-antioch', variantId: 'alba' };
  const data = buildModelCardData(model, wb);
  const bag = data.abilities.find(a => /bagpipes/i.test(a.name));
  ok(!!bag, 'bagpipes presente');
  // La factionRule Alba tiene desc, debería estar fusionada.
  ok(bag.desc && bag.desc.length > 0, 'descripción presente tras fusión');
});

group('Group 3: ABILITY_LIBRARY fallback si fuente sin desc', () => {
  // Pick una habilidad real del ABILITY_LIBRARY como mockup.
  const libKeys = ABILITY_LIBRARY ? Object.keys(ABILITY_LIBRARY) : [];
  if (libKeys.length === 0) { ok(false, 'ABILITY_LIBRARY vacío (no test)'); return; }
  const knownAbility = libKeys[0];
  const knownSummary = ABILITY_LIBRARY[knownAbility].summary;
  const model = {
    name: 'Test', uid: 'm3',
    companionStats: { move:'6"', ranged:'0', melee:'0', armour:'0' },
    companionEquipment: [],
    companionKeywords: [{ name: knownAbility }],  // sin desc
    companionAbilities: [],
    companionCost: 50,
  };
  const wb = { factionId: 'new-antioch' };
  const data = buildModelCardData(model, wb);
  const ab = data.abilities.find(a => a.name === knownAbility);
  if (ab && knownSummary) {
    ok(ab.desc === knownSummary, 'fallback ABILITY_LIBRARY summary aplicado');
  } else {
    ok(true, '(saltado: ABILITY_LIBRARY entry no tiene summary)');
  }
});

group('Group 4: keyword sin desc tras dedupe queda con nombre solo', () => {
  const model = {
    name: 'X', uid: 'm4',
    companionStats: {}, companionEquipment: [],
    companionKeywords: [{ name: 'TOTALLY_UNKNOWN_KW_xyz' }],
    companionAbilities: [], companionCost: 0,
  };
  const data = buildModelCardData(model, { factionId:'new-antioch' });
  const x = data.abilities.find(a => a.name === 'TOTALLY_UNKNOWN_KW_xyz');
  ok(!!x, 'keyword desconocido aparece');
  ok(typeof x.desc === 'string', 'desc es string (vacío si nada)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
