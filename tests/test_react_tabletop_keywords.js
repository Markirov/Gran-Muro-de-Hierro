/* Modo Mesa: las keywords del modelo tienen efecto visible.
 * - STRONG (canon Rulebook 1.0.2: NEGATE HEAVY + arma CaC de 2 manos como 1 mano)
 *   atenúa HEAVY (sin tachar) en armas y equipo, y en armas CaC de 2 manos
 *   tacha "2H" y muestra "1H".
 * - Las armas 1-Handed/2-Handed van a ARMAS, no a EQUIPO (Siege Jezzail).
 * - Infección y Bendición tienen desplegables independientes.
 * Petición de Marcos 2026-09-29.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const src = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'partida', 'TabletopMode.tsx'), 'utf8');

console.log('\nGroup 1: clasificación de armas');
ok(/const isWeapon = /.test(src), 'hay helper isWeapon');
ok(/handed/i.test((src.match(/const isWeapon = [^\n]*/) || [''])[0]), 'isWeapon reconoce 1-Handed/2-Handed');
ok(/equipment\.filter\(\(e:any\) => isWeapon\(e\)\)/.test(src) && /equipment\.filter\(\(e:any\) => !isWeapon\(e\)\)/.test(src), 'armas y equipo se separan con isWeapon');

console.log('\nGroup 2: STRONG atenúa HEAVY');
ok(/const keywordInactive = /.test(src), 'hay helper keywordInactive');
ok((src.match(/keywordInactive\(kw\)/g) || []).length >= 2, 'se aplica en armas y en equipo');
ok(!/line-through/.test((src.match(/keywordInactive\(kw\)[\s\S]{0,400}/g) || []).join('')), 'la keyword inactiva no se tacha');
ok(/STRONG: no aplica/.test(src), 'nota "(STRONG: no aplica)"');

console.log('\nGroup 3: STRONG y armas CaC de 2 manos');
ok(/const strongOneHand = /.test(src), 'hay cálculo strongOneHand');
ok(/strongOneHand[\s\S]{0,300}line-through[\s\S]{0,200}1H/.test(src), 'tacha 2H y muestra 1H');

console.log('\nGroup 4: desplegables independientes');
ok(!/showExtraMarkers/.test(src), 'sin toggle compartido');
ok(/const \[showInfection, setShowInfection\]/.test(src) && /const \[showBlessing, setShowBlessing\]/.test(src), 'estado propio para Infección y Bendición');
ok(/Mostrar Infección/.test(src) && /Mostrar Bendición/.test(src), 'botón propio para cada uno');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
