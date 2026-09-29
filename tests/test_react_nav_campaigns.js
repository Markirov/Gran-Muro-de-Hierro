/* Barra superior de la app React: "Campañas" debe llevar a la ruta React
 * /campana, no al simulador antiguo (app.html?mode=campana). Reportado por
 * Marcos 2026-09-29.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const layout = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'layout.tsx'), 'utf8');

console.log('\nGroup 1: enlace Campañas');
ok(/<Link[^>]*href=["']\/campana["'][\s\S]*?Campañas<\/Link>/.test(layout), 'Campañas es un <Link> a /campana');
ok(!/app\.html\?mode=campana/.test(layout), 'la barra no enlaza al modo campaña antiguo');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
