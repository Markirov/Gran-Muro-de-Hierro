/* Fase 1: Datos de la tarjeta (sin canvas).
 *
 * Pure data extraction: buildModelCardData devuelve objeto listo
 * para render. Helpers: getFactionPalette, getImplicitAbilities,
 * getVariantFactionRules.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_card_data.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  FACTION_PALETTES: typeof FACTION_PALETTES !== 'undefined' ? FACTION_PALETTES : null,
  VARIANT_PALETTES: typeof VARIANT_PALETTES !== 'undefined' ? VARIANT_PALETTES : null,
  EQUIPMENT_IMPLICIT_ABILITIES: typeof EQUIPMENT_IMPLICIT_ABILITIES !== 'undefined' ? EQUIPMENT_IMPLICIT_ABILITIES : null,
  getFactionPalette: typeof getFactionPalette === 'function' ? getFactionPalette : null,
  getImplicitAbilities: typeof getImplicitAbilities === 'function' ? getImplicitAbilities : null,
  getVariantFactionRules: typeof getVariantFactionRules === 'function' ? getVariantFactionRules : null,
  buildModelCardData: typeof buildModelCardData === 'function' ? buildModelCardData : null,
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
for (const h of ['FACTION_PALETTES','EQUIPMENT_IMPLICIT_ABILITIES','getFactionPalette','getImplicitAbilities','getVariantFactionRules','buildModelCardData']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { FACTION_PALETTES, EQUIPMENT_IMPLICIT_ABILITIES, getFactionPalette,
        getImplicitAbilities, getVariantFactionRules, buildModelCardData } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

// Fixtures
const albaWb = { factionId:'new-antioch', variantId:'alba' };
const defironWb = { factionId:'iron-sultanate', variantId:'iron-wall-def' };
const unknownWb = { factionId:'inexistent' };

function mkModel(name, equipment, keywords) {
  return {
    name, uid: 'm_'+name.replace(/\s/g,''),
    companionStats: { move:'6"', ranged:'1', melee:'0', armour:'0' },
    companionEquipment: equipment || [],
    companionKeywords: (keywords || []).map(k => ({ name: k })),
    companionAbilities: [],
    companionCost: 50,
  };
}

/* ------------------------------------------------------------------ */
group('Group 1: FACTION_PALETTES base SPEC v2 (RGB arrays + UPPER keys)', () => {
  ok(!!FACTION_PALETTES['new-antioch'], 'new-antioch palette exists');
  ok(!!FACTION_PALETTES['iron-sultanate'], 'iron-sultanate palette exists');
  const naF = FACTION_PALETTES['new-antioch'].FRAME;
  ok(Array.isArray(naF) && naF[0] === 95 && naF[1] === 25 && naF[2] === 25, 'NA FRAME = [95,25,25]');
  const isF = FACTION_PALETTES['iron-sultanate'].FRAME;
  ok(Array.isArray(isF), 'IS FRAME es array RGB');
});

group('Group 2: getFactionPalette merge base + variant (ORNAMENT upper)', () => {
  ok(getFactionPalette(albaWb).ORNAMENT === 'thistle', 'Alba ORNAMENT = thistle (variant override)');
  ok(getFactionPalette(defironWb).ORNAMENT === 'fortified_tower', 'DefIron ORNAMENT = fortified_tower (variant override)');
  // Unknown faction → fallback NA. Compara primer elemento RGB en lugar de identidad.
  const fb = getFactionPalette(unknownWb).FRAME;
  ok(Array.isArray(fb) && fb[0] === 95, 'unknown faction → fallback NA FRAME[0]=95');
  // Alba merge: variante sobrescribe FRAME a azul Saltire.
  const albaFrame = getFactionPalette(albaWb).FRAME;
  ok(Array.isArray(albaFrame) && albaFrame[2] > albaFrame[0], 'Alba FRAME es azul (B > R)');
});

group('Group 3: EQUIPMENT_IMPLICIT_ABILITIES map', () => {
  ok(Array.isArray(EQUIPMENT_IMPLICIT_ABILITIES['Trench Shield']), 'Trench Shield in map');
  ok(EQUIPMENT_IMPLICIT_ABILITIES['Trench Shield'][0].name === 'Shield Combo', 'Shield Combo');
  ok(EQUIPMENT_IMPLICIT_ABILITIES['Binoculars'][0].name === 'Survey the Land', 'Survey the Land');
  ok(EQUIPMENT_IMPLICIT_ABILITIES['Alchemist Armour'].length === 2, 'Alchemist Armour = 2 abilities');
});

group('Group 4: getImplicitAbilities recorre equipment', () => {
  const m1 = mkModel('Azeb', [{name:'Trench Shield'}]);
  const a1 = getImplicitAbilities(m1);
  ok(a1.length === 1 && a1[0].name === 'Shield Combo', 'Trench Shield → Shield Combo');

  const m2 = mkModel('Jabirean', [{name:'Alchemist Armour'}]);
  const a2 = getImplicitAbilities(m2);
  ok(a2.length === 2, 'Alchemist Armour → 2 abilities');
  ok(a2.some(a => /FIRE/i.test(a.name)), 'incluye NEGATE FIRE');
  ok(a2.some(a => /GAS/i.test(a.name)), 'incluye NEGATE GAS');

  const m3 = mkModel('Unknown Item', [{name:'XYZ-Inexistent-123'}]);
  ok(getImplicitAbilities(m3).length === 0, 'item desconocido → 0 implicit');

  const m4 = mkModel('Empty', []);
  ok(getImplicitAbilities(m4).length === 0, 'sin equipment → 0');

  const m5 = mkModel('Officer', [{name:'Binoculars'}]);
  const a5 = getImplicitAbilities(m5);
  ok(a5.length === 1 && a5[0].name === 'Survey the Land', 'Binoculars → Survey the Land');
});

group('Group 5: getVariantFactionRules', () => {
  const defironRules = getVariantFactionRules(defironWb);
  ok(Array.isArray(defironRules), 'returns array');
  ok(defironRules.some(r => /siege jezzail/i.test(r.name)), 'incluye Siege Jezzail Teams');
  ok(defironRules.some(r => /marksmanship.*iron wall/i.test(r.name)), 'incluye Marksmanship');

  const albaRules = getVariantFactionRules(albaWb);
  ok(Array.isArray(albaRules), 'Alba returns array');

  ok(getVariantFactionRules({}).length === 0, 'no factionId → empty');
});

group('Group 6: buildModelCardData orquesta todo', () => {
  const silahdar = mkModel('Silahdar', [{name:'Binoculars'}], ['ELITE','LEADER','OFFICER','SULTANATE']);
  const data = buildModelCardData(silahdar, defironWb);
  ok(typeof data === 'object', 'returns object');
  ok(data.palette && data.palette.ORNAMENT === 'fortified_tower', 'palette.ORNAMENT = fortified_tower');
  ok(Array.isArray(data.abilities), 'abilities array');
  // 4 keywords + 2 reglas banda + 1 Binoculars implicit = 7
  ok(data.abilities.length >= 6, `abilities >= 6 (got ${data.abilities.length})`);
  ok(typeof data.cost === 'number', 'cost numeric');
  ok(Array.isArray(data.stats) && data.stats.length === 4, '4 stats canon: MOV/RNG/MEL/ARM (B Blood eliminada)');
});

group('Group 7: buildModelCardData — hasElementalMastery flag', () => {
  const jabirean = mkModel('Jabirean Alchemist', [{name:'Alchemist Armour'}], ['ELITE','ALCHEMIST']);
  jabirean.companionAbilities = [{ name: 'Mastery of the Elements' }];
  const data = buildModelCardData(jabirean, defironWb);
  ok(data.hasElementalMastery === true, 'hasElementalMastery true');

  const azeb = mkModel('Azeb', [], ['SULTANATE']);
  const azebData = buildModelCardData(azeb, defironWb);
  ok(azebData.hasElementalMastery === false, 'azeb no mastery');
});

group('Group 8: buildModelCardData — defensive', () => {
  let threw = false;
  try { buildModelCardData(null, defironWb); } catch (e) { threw = true; }
  ok(!threw, 'null model no-throw');
  try { buildModelCardData(mkModel('X'), null); } catch (e) { threw = true; }
  ok(!threw, 'null wb no-throw');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
