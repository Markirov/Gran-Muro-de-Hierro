/* Test for Fase 7.2: warband history QM tab — markup smoke
 *
 * Logic is in getWarbandBattleHistory (covered by test_warband_history.js).
 * This subfase only adds the QM tab + pane + renderQMHistory.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: history QM tab DOM markup', () => {
  ok(/data-qmtab="history"/.test(html), 'history tab button exists');
  ok(html.includes('id="qm-pane-history"'), 'history pane exists');
  ok(/function renderQMHistory\(/.test(html), 'renderQMHistory function defined');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
