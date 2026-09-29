/* El presupuesto de la banda (budgetTotal) se puede editar: al crearla
 * (prellenado con el de la facción) y después en la cabecera del Roster.
 * Petición de Marcos 2026-09-29 ("no que sea 500 por defecto").
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const read = (...p) => fs.readFileSync(path.join(ROOT, 'app', ...p), 'utf8');
const roster = read('(app)', 'bandas', 'roster', 'page.tsx');
const crear = read('(app)', 'bandas', 'crear', 'page.tsx');

console.log('\nGroup 1: Roster');
ok(/openBudgetModal[\s\S]*setTempBudget\(wb\.budgetTotal/.test(roster) && /<input[^>]*type=["']number["'][^>]*value=\{tempBudget\}/.test(roster), 'el modal de presupuesto tiene un input numérico ligado a tempBudget');
ok(/budgetTotal:\s*Math\.max\(0,\s*tempBudget\)/.test(roster) && /saveWb\(\{\s*\.\.\.wb,/.test(roster), 'guardar el modal persiste el nuevo budgetTotal');

console.log('\nGroup 2: Crear banda');
ok(/useState<number>\(\s*FACTIONS/.test(crear) || /setBudget\(/.test(crear), 'hay estado de presupuesto en la creación');
ok(/budgetTotal:\s*budget\b/.test(crear), 'la banda nueva usa el presupuesto elegido');
ok(/<input[^>]*type=["']number["'][^>]*value=\{budget\}/.test(crear), 'input numérico de presupuesto al crear');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
