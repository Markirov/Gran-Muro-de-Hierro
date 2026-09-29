/*
 * Armería es una vista estrictamente de solo lectura también para mejoras.
 * En Bazar se pueden seleccionar/deseleccionar; en Armería solo se muestran
 * las mejoras ya activas y no existe ninguna mutación al pulsarlas.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(
  path.join(ROOT, 'app', '(app)', 'bandas', 'roster', 'ModelDetails.tsx'),
  'utf8'
);

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); pass++; }
  else { console.log('  ✗ ' + msg); fail++; }
}

console.log('\nGroup 1: Armería solo muestra mejoras activas');
ok(/const upgradesToDisplay = isShop\s*\?\s*allUpgrades\s*:\s*allUpgrades\.filter\(up => activeUpgrades\.includes\(up\.id\)\)/.test(src),
  'Armería filtra la lista a mejoras ya activas');
ok(/\{\(isShop \? allUpgrades\.length > 0 : upgradesToDisplay\.length > 0\) &&/.test(src),
  'la sección de mejoras vacía se oculta en Armería');
ok(/upgradesToDisplay\.map\(\(up: any\) =>/.test(src),
  'el render usa la lista filtrada');

console.log('\nGroup 2: Armería no muta mejoras');
ok(/onClick=\{\(\) => isShop && !upBlocked && handleToggleUpgrade\(up\.id\)\}/.test(src),
  'la tarjeta solo cambia mejoras desde Bazar');
ok(/className=\{`relative p-3 border-2 rounded-lg transition-all \$\{isShop \? 'cursor-pointer' : 'cursor-default'\}/.test(src),
  'la tarjeta no comunica interacción en Armería');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
