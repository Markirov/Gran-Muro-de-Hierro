const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../app/data');
const destDir = path.resolve(__dirname, '../public/js');

const LIB_FILES = [
  'cost_calculation.ts',
  'limit_validation.ts',
  'battlekit_legality_engine.ts',
  'battlekit_deltas.ts',
  'loadout_lab.ts'
];
const LIB_MAP = {
  'cost_calculation.ts': '20_cost_calculation.js',
  'limit_validation.ts': '21_limit_validation.js',
  'battlekit_legality_engine.ts': '22_battlekit_legality_engine.js',
  'battlekit_deltas.ts': '14_battlekit_deltas_armoury_upgrade_recomme.js',
  'loadout_lab.ts': '12_loadout_lab_analyse_single_model_variant.js'
};

const IMPORT_LINE = /^import\s[\s\S]*?from\s*['"][^'"]+['"];?[ \t]*\r?\n/gm;

// app.html carga public/js como scripts clásicos que comparten globales:
// fuera import/export de ES, que allí son SyntaxError.
function toLegacyScript(content) {
  const nl = content.includes('\r\n') ? '\r\n' : '\n';
  let out = content
    .replace(IMPORT_LINE, '')
    .replace(/^export\s*\{[\s\S]*?\};?[ \t]*\r?\n?/gm, '')
    .replace(/^export (const|function|let) /gm, '$1 ')
    .replace(/^\s*(\r?\n)+/, '');
  if (!/^\/\/ @ts-nocheck/.test(out)) out = '// @ts-nocheck' + nl + out;
  return out;
}

// Los datos: fuera import (comparten globales) y export, sin tocar la cabecera
// (una `export function` debe seguir siendo function, no const).
function toLegacyData(content) {
  return content
    .replace(IMPORT_LINE, '')
    .replace(/^export\s*\{[\s\S]*?\};?[ \t]*\r?\n?/gm, '')
    .replace(/^export (const|function|let) /gm, '$1 ');
}

const DATA_FILES = [
  '01_trench_crusade_game_data.ts',
  '02_ability_library.ts',
  '03_keyword_glossary_canon_fuente_nica_de_lo.ts',
  '04_keyword_library.ts',
  '05_weapon_keyword_library.ts',
  '06_faction_special_rules_library.ts',
  '07_general_terms_library.ts',
  '08_stipulation_library.ts'
];

function main() {
  for (const f of LIB_FILES) {
    const content = fs.readFileSync(path.join(__dirname, '../app/lib', f), 'utf8');
    fs.writeFileSync(path.join(destDir, LIB_MAP[f]), toLegacyScript(content));
    console.log(` -> Generado public/js/${LIB_MAP[f]}`);
  }

  console.log('Compilando módulos TS de datos a Vanilla JS para la app legacy...');
  for (const f of DATA_FILES) {
    let content = fs.readFileSync(path.join(srcDir, f), 'utf8');
    content = toLegacyData(content);
    const outName = f.replace('.ts', '.js');
    fs.writeFileSync(path.join(destDir, outName), content);
    console.log(` -> Generado public/js/${outName}`);
  }
  console.log('Completado.');
}

module.exports = { toLegacyScript, toLegacyData, LIB_FILES, DATA_FILES };
if (require.main === module) main();
