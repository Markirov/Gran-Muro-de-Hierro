/* Guards for the React roster:
 * - Armería must never mutate upgrades, even if its handler is invoked.
 * - A purchase must not make the Ducados remaining negative.
 * - The editable budget cannot be saved below the amount already spent.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const details = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'bandas', 'roster', 'ModelDetails.tsx'), 'utf8');
const roster = fs.readFileSync(path.join(ROOT, 'app', '(app)', 'bandas', 'roster', 'page.tsx'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); pass++; }
  else { console.log('  ✗ ' + msg); fail++; }
}

console.log('\nGroup 1: Armería bloquea mejoras en el handler');
ok(/const isShop = armouryTab === 'shop'/.test(details), 'el handler conoce si está en Bazar');
ok(/const handleToggleUpgrade = \(upId: string\) => \{\s*if \(!isShop\) return;/.test(details),
  'el handler rechaza mutaciones fuera de Bazar');
ok(/onClick=\{\(\) => isShop && !upBlocked && handleToggleUpgrade\(up\.id\)\}/.test(details),
  'la tarjeta también queda protegida');

console.log('\nGroup 2: compras dentro del presupuesto');
ok(/const canAffordWarband = \(newWb: any\) =>/.test(roster), 'existe una guardia central de presupuesto');
ok(/if \(!canAffordWarband\(newWb\)\) \{/.test(roster), 'reclutar bloquea una banda sobregirada');
ok(/if \(!canAffordWarband\(newWb\)\) \{/.test(roster.slice(roster.indexOf('onUpdateModel={(newModel) =>'))),
  'actualizar equipo o mejoras bloquea una banda sobregirada');

console.log('\nGroup 3: edición del presupuesto');
ok(/const minimumBudget = spentDucados/.test(roster), 'el presupuesto mínimo se basa en lo ya gastado');
ok(/budgetTotal: Math\.max\(minimumBudget, tempBudget\)/.test(roster), 'guardar presupuesto nunca baja del gasto actual');
ok(/min=\{spentDucados\}/.test(roster), 'el input refleja el mínimo gastado');
ok(/const remainingDucados = Math\.max\(0,/.test(roster) && /\{remainingDucados\}/.test(roster),
  'el saldo visible nunca se renderiza en negativo');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
