/* STRONG según el canon del Rulebook 1.0.2 (KEYWORD_GLOSSARY): NEGATE HEAVY y
 * arma cuerpo a cuerpo de 2 manos como de 1 mano. ABILITY_LIBRARY decía
 * "+1 INJURY DICE en cuerpo a cuerpo" y KEYWORD_LIBRARY "bonificadores en
 * cuerpo a cuerpo" (inventado). El Modo Mesa describe las keywords del modelo
 * con el glosario canon antes que con KEYWORD_LIBRARY.
 * Petición de Marcos 2026-09-29 ("lo que manda es el canon de la 1.0.2").
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const read = (...p) => fs.readFileSync(path.join(ROOT, 'app', ...p), 'utf8');
const ability = read('data', '02_ability_library.ts');
const keyword = read('data', '04_keyword_library.ts');
const glossary = read('data', '03_keyword_glossary_canon_fuente_nica_de_lo.ts');
const tabletop = read('(app)', 'partida', 'TabletopMode.tsx');

const canon = (glossary.match(/key: 'STRONG'[\s\S]*?text: '([^']+)'/) || [])[1] || '';
ok(/NEGATE HEAVY/.test(canon), 'el glosario canon de STRONG incluye NEGATE HEAVY');

console.log('\nGroup 1: textos de STRONG');
const ab = (ability.match(/'STRONG': \{[\s\S]*?summary: '([^']*)'/) || [])[1] || '';
ok(ab === canon, 'ABILITY_LIBRARY.STRONG = texto canon');
ok(!/INJURY DICE/.test(ab), 'ABILITY_LIBRARY.STRONG sin el +1 INJURY DICE inventado');
const kw = (keyword.match(/'STRONG':\s*'([^']*)'/) || [])[1] || '';
ok(/NEGATE HEAVY/.test(kw) && /2 manos/.test(kw), 'KEYWORD_LIBRARY.STRONG menciona NEGATE HEAVY y 2 manos');

console.log('\nGroup 2: Modo Mesa usa el glosario canon');
ok(/import \{ glossaryText \} from '..\/..\/data\/03_keyword_glossary_canon_fuente_nica_de_lo'/.test(tabletop), 'importa glossaryText');
ok(/glossaryText\(kw\)\s*\|\|\s*KEYWORD_LIBRARY\[kw\]/.test(tabletop), 'keyword del modelo: glosario primero, KEYWORD_LIBRARY de reserva');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
