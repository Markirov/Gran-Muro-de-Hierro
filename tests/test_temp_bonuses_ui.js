/* Test for P2/7: tempBonuses UI in QM Status pane
 *
 * Smoke check: renderQMStatus emits a "Bonuses temporales activos"
 * section when wb.tempBonuses has entries. The decay logic itself
 * is covered by test_exploration_morale_bonus.js.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: tempBonuses UI markup', () => {
  ok(html.includes('Bonuses temporales activos'),
     'QM Status renderer mentions "Bonuses temporales activos"');
  ok(/scope === 'next-game'/.test(html) || /'próxima batalla'/.test(html),
     'scope label rendering present');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
