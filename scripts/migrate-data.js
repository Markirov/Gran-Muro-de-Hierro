const fs = require('fs');

const files = [
  '01_trench_crusade_game_data.js',
  '02_ability_library.js',
  '03_keyword_glossary_canon_fuente_nica_de_lo.js',
  '04_keyword_library.js',
  '05_weapon_keyword_library.js',
  '06_faction_special_rules_library.js',
  '07_general_terms_library.js',
  '08_stipulation_library.js'
];

for(const f of files) {
  if (!fs.existsSync('public/js/' + f)) continue;
  let content = fs.readFileSync('public/js/' + f, 'utf8');
  content = content.replace(/const (DATA|COURT_SIN_POWERS|ABILITY_LIBRARY|KEYWORD_GLOSSARY|KEYWORD_LIBRARY|WEAPON_KEYWORD_LIBRARY|FACTION_SPECIAL_RULES|GENERAL_TERMS|STIPULATION_LIBRARY)\s*=/g, 'export const $1 =');
  fs.writeFileSync('app/data/' + f.replace('.js', '.ts'), content);
  fs.unlinkSync('public/js/' + f);
  console.log('Migrado', f);
}
