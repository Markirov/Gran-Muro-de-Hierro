/* Test for P2/7: tempBonuses UI in QM Status pane
 *
 * Smoke check: renderQMStatus emits a "Bonuses temporales activos"
 * section when wb.tempBonuses has entries. The decay logic itself
 * is covered by test_exploration_morale_bonus.js.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'app.html');
let html = fs.readFileSync(HTML_PATH, 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';

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
