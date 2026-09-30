const fs = require('fs');
const path = require('path');

const loadFile = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

// Load environment and data
eval(loadFile('public/js/01_trench_crusade_game_data.js') + '\nglobal.DATA = DATA;');
eval(loadFile('public/js/02_ability_library.js') + '\nglobal.ABILITY_LIBRARY = ABILITY_LIBRARY;');
eval(loadFile('public/js/03_keyword_glossary_canon_fuente_nica_de_lo.js') + '\nglobal.KEYWORD_GLOSSARY = KEYWORD_GLOSSARY;');
eval(loadFile('public/js/04_keyword_library.js') + '\nglobal.KEYWORD_LIBRARY = KEYWORD_LIBRARY;');
eval(loadFile('public/js/05_weapon_keyword_library.js') + '\nglobal.WEAPON_KEYWORD_LIBRARY = WEAPON_KEYWORD_LIBRARY;');
eval(loadFile('public/js/06_faction_special_rules_library.js') + '\nglobal.FACTION_RULES_LIBRARY = FACTION_RULES_LIBRARY;');
eval(loadFile('public/js/20_cost_calculation.js'));
eval(loadFile('public/js/21_limit_validation.js'));
eval(loadFile('public/js/22_battlekit_legality_engine.js'));

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
    pass++;
  } else {
    console.log('  ✗ ' + msg);
    fail++;
  }
}

console.log('=== TEST: COMPANION IMPORT AND EXPORT (tests/test_companion_import_export.js) ===\n');

// 1. Cargar archivo Caza2.json
console.log('Group 1: Parsing Caza2.json');
const cazaRaw = fs.readFileSync(path.resolve(__dirname, '..', 'Bandas', 'Caza2.json'), 'utf8');
let cazaData = null;
try {
  cazaData = JSON.parse(cazaRaw);
} catch (e) {}

ok(!!cazaData, 'Caza2.json es parseable como JSON');
ok(cazaData['warband-name'] === 'Protectores del Muro', 'Nombre de la banda es Protectores del Muro');
ok(cazaData['ducat-rating'] === 698, 'Rating ducados es 698');
ok(cazaData.models.length === 9, 'Contiene 9 modelos');

// 2. Comprobar correspondencia de modelos canónicos de Caza2
console.log('\nGroup 2: Correspondencia de modelos');
const silahdar = cazaData.models[0];
ok(silahdar['model-id'] === 'md_yuzbasicaptain_mv_silahdar', 'Silahdar model-id es md_yuzbasicaptain_mv_silahdar');
ok(silahdar.cost.ducats === 169, 'Coste de Silahdar es 169 ducados');

const janofficer = cazaData.models[1];
ok(janofficer['model-id'] === 'md_janissaries_mv_officer', 'Janissary Officer model-id es md_janissaries_mv_officer');
ok(janofficer.cost.ducats === 127, 'Coste de Janissary Officer es 127 ducados');

const azeb = cazaData.models[2];
ok(azeb['model-id'] === 'md_azeb', 'Azeb model-id es md_azeb');
ok(azeb.cost.ducats === 32, 'Coste de Azeb es 32 ducados');

const jabirean = cazaData.models[8];
ok(jabirean['model-id'] === 'md_jabireanalchemist', 'Jabirean model-id es md_jabireanalchemist');
ok(jabirean.cost.ducats === 115, 'Coste de Jabirean es 115 ducados');

// 3. Verificación de suma de rating total
console.log('\nGroup 3: Verificación de balance económico');
const sumCosts = cazaData.models.reduce((acc, m) => acc + (m.cost ? m.cost.ducats : 0), 0);
ok(sumCosts === 698, `Suma de costes (${sumCosts}) coincide con ducat-rating (698)`);
ok(sumCosts + cazaData['ducat-bank'] === 700, 'Suma con banco equivale a presupuesto 700');

// 4. Verificación de equipamiento y mapeo a armería
console.log('\nGroup 4: Mapeo de equipo canónico');
const silahdarEq = silahdar.equipment.map(e => e['equipment-name']);
ok(silahdarEq.includes('Trench Shield'), 'Silahdar lleva Trench Shield');
ok(silahdarEq.includes('Greatsword / Greataxe'), 'Silahdar lleva Greatsword / Greataxe');
ok(silahdarEq.includes('Alchemist Armour'), 'Silahdar lleva Alchemist Armour');
ok(silahdarEq.includes('Alaybozan'), 'Silahdar lleva Alaybozan');
ok(silahdarEq.includes('Medi-Kit'), 'Silahdar lleva Medi-Kit');
ok(silahdarEq.includes('Anqa Guard'), 'Silahdar lleva Anqa Guard');
ok(silahdarEq.includes('Alchemical Ammunition'), 'Silahdar lleva Alchemical Ammunition');

const jabEq = jabirean.equipment.map(e => e['equipment-name']);
ok(jabEq.includes('Sniper Rifle'), 'Jabirean lleva Sniper Rifle');
ok(jabEq.includes('Standard Armour'), 'Jabirean lleva Standard Armour');
ok(jabEq.includes('Binoculars'), 'Jabirean lleva Binoculars');

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
