/* SPEC-rediseno-ui Sub-F — Botón "🛒 + Equipo a wishlist" en panel Detalle.
 *
 * Verifica:
 * - data-add-equip-wishlist en el render
 * - CSS .btn-equip-wishlist con acento amarillo/dorado
 * - Handler delegation con prompt + addShoppingItem scope='unit'
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: Botón en render renderDetailCompanion', () => {
  ok(/data-add-equip-wishlist/.test(html), 'atributo data-add-equip-wishlist');
  ok(/btn-equip-wishlist/.test(html), 'clase btn-equip-wishlist');
  ok(/Equipo a wishlist/i.test(html), 'texto "Equipo a wishlist"');
});

group('Group 2: CSS estilo amarillo/dorado', () => {
  ok(/\.btn-equip-wishlist\s*\{[^}]*border-left:\s*3px\s*solid\s*#d4a040/m.test(html),
     'border-left dorado #d4a040');
});

group('Group 3: Handler delegation invoca modal Sub-E modo unit', () => {
  ok(/data-add-equip-wishlist.*closest/s.test(html), 'delegation con closest');
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'unit',\s*modelUid\)/.test(html),
     "delega a openAddShoppingModal mode=unit + modelUid");
});

group('Group 4: Botón aparece también si modelo sin equipo (fallback)', () => {
  // Render rama "else" para modelos sin equipo.
  ok(/Sin equipo registrado/.test(html),
     'fallback "Sin equipo registrado" presente');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
