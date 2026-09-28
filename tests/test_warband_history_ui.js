/* Test for Fase 7.2: warband history QM tab — markup smoke
 *
 * Logic is in getWarbandBattleHistory (covered by test_warband_history.js).
 * This subfase only adds the QM tab + pane + renderQMHistory.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'public', 'app.html');
let html = fs.readFileSync(HTML_PATH, 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'public', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';

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

