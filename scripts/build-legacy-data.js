const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../app/data');
const destDir = path.resolve(__dirname, '../public/js');

const libFiles = [
  'cost_calculation.ts', 
  'limit_validation.ts',
  'battlekit_legality_engine.ts',
  'battlekit_deltas.ts',
  'loadout_lab.ts'
];
for (const f of libFiles) {
  let content = fs.readFileSync(path.join(__dirname, '../app/lib', f), 'utf8');
  content = content.replace(/export (const|function) /g, '$1 ');
  const fileMap = {
    'cost_calculation.ts': '20_cost_calculation.js',
    'limit_validation.ts': '21_limit_validation.js',
    'battlekit_legality_engine.ts': '22_battlekit_legality_engine.js',
    'battlekit_deltas.ts': '14_battlekit_deltas_armoury_upgrade_recomme.js',
    'loadout_lab.ts': '12_loadout_lab_analyse_single_model_variant.js'
  };
  let outName = fileMap[f];
  fs.writeFileSync(path.join(destDir, outName), content);
  console.log(` -> Generado public/js/${outName}`);
}

const files = [
  '01_trench_crusade_game_data.ts',
  '02_ability_library.ts',
  '03_keyword_glossary_canon_fuente_nica_de_lo.ts',
  '04_keyword_library.ts',
  '05_weapon_keyword_library.ts',
  '06_faction_special_rules_library.ts',
  '07_general_terms_library.ts',
  '08_stipulation_library.ts',
  'factions.ts'
];

console.log('Compilando módulos TS de datos a Vanilla JS para la app legacy...');
for (const f of files) {
  if (f === 'factions.ts') continue;
  let content = fs.readFileSync(path.join(srcDir, f), 'utf8');
  content = content.replace(/export (const|function) /g, 'const ');
  const outName = f.replace('.ts', '.js');
  fs.writeFileSync(path.join(destDir, outName), content);
  console.log(` -> Generado public/js/${outName}`);
}
console.log('Completado.');
