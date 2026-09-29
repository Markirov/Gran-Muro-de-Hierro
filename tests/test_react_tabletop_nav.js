/* Modo Mesa (TabletopMode): un solo scroll y navegación con flechas ←/→.
 * Marcos 2026-09-29: "¿por qué hay un segundo scroll?" y "usar las flechas
 * no cambia de miniatura como sí hacía antes".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const src = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'partida', 'TabletopMode.tsx'), 'utf8');

console.log('\nGroup 1: un solo scroll');
ok(/document\.body\.style\.overflow\s*=\s*['"]hidden['"]/.test(src), 'bloquea el scroll de la página de fondo mientras está abierto');
ok(/fixed inset-0[^"]*overflow-hidden/.test(src), 'el overlay raíz no desborda');

console.log('\nGroup 2: flechas del teclado');
ok(/addEventListener\(\s*['"]keydown['"]/.test(src), 'escucha keydown');
ok(/ArrowRight/.test(src) && /ArrowLeft/.test(src), 'ArrowLeft / ArrowRight');
ok(/removeEventListener\(\s*['"]keydown['"]/.test(src), 'limpia el listener al cerrar');
ok(/INPUT|TEXTAREA|isContentEditable/.test(src), 'no roba las flechas cuando se escribe en un campo');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
