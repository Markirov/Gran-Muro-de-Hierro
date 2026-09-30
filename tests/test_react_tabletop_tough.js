/* Modo Mesa: Regla TOUGH con símbolo de facción en el botón Fuera.
 * Petición de Marcos 2026-09-30:
 * - Una miniatura con TOUGH muestra el símbolo de su facción en el botón "Fuera".
 * - Al pulsar "Fuera" por primera vez:
 *   1. Se avisa de que es la primera vez que cae (alerta/modal visual de TOUGH).
 *   2. Se retira el símbolo (toughUsed: true).
 *   3. Se devuelve a "En Pie" (status: 'up').
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const src = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'partida', 'TabletopMode.tsx'), 'utf8');

console.log('\nGroup 1: Símbolos de facción y detección de TOUGH');
ok(/const getFactionSymbol =/.test(src), 'helper getFactionSymbol existe');
ok(/iron-sultanate/.test(src) && /new-antioch/.test(src) && /trench-pilgrims/.test(src), 'mapea facciones principales');
ok(/hasTough\s*=\s*modelKeywords\.includes\('TOUGH'\)/.test(src), 'detecta TOUGH en keywords');
ok(/abilities\.some\(.*TOUGH/i.test(src), 'detecta TOUGH en abilities');

console.log('\nGroup 2: Estado de TOUGH y activación al pulsar Fuera');
ok(/const toughUsed = !!st\.toughUsed;/.test(src), 'comprueba si TOUGH ya fue usado');
ok(/const toughActive = hasTough && !toughUsed;/.test(src), 'calcula si TOUGH está activo');
ok(/handleSetStatus/.test(src), 'existe manejador de cambio de estado handleSetStatus');
ok(/s === 'out' && toughActive/.test(src), 'detecta cuando se pulsa Fuera teniendo TOUGH');
ok(/status:\s*'up',\s*toughUsed:\s*true/.test(src), 'devuelve a En Pie y gasta TOUGH');
ok(/setToughAlert/.test(src), 'desencadena el aviso visual');

console.log('\nGroup 3: UI del botón Fuera e indicadores');
ok(/handleSetStatus\('out'\)/.test(src), 'el botón Fuera invoca handleSetStatus');
ok(/toughActive &&[\s\S]{0,200}factionSymbol/.test(src), 'muestra el símbolo de facción en el botón Fuera si está activo');
ok(/toughAlert &&[\s\S]{0,800}Regla TOUGH Activada/i.test(src), 'modal de alerta de TOUGH implementado');
ok(/toughUsed &&[\s\S]{0,800}Restaurar/i.test(src), 'permite restaurar TOUGH si se gastó por error');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
