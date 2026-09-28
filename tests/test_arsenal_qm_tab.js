/* Test for P2/6: Arsenal QM tab
 *
 * wb.arsenal is populated by Fase 5.6 (add-named-battlekit auto-apply)
 * and addToArsenal but had no UI panel. This subfase adds an Arsenal
 * tab to the QM modal listing entries with a remove action.
 *
 * Scope:
 *   - QM gets a new tab data-qmtab="arsenal" + pane qm-pane-arsenal.
 *   - renderQMArsenal lists wb.arsenal rows with name/currency/cost/
 *     source/addedAt and a "Quitar" button.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'app.html');
const jsContent = fs.readdirSync(path.resolve(__dirname, '..', 'js')).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(__dirname, '..', 'js', x), 'utf8')).join('\n');
let html = fs.readFileSync(HTML_PATH, 'utf8') + jsContent;
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: DOM markup', () => {
  ok(/data-qmtab="arsenal"/.test(html), 'arsenal tab button exists');
  ok(html.includes('id="qm-pane-arsenal"'), 'arsenal pane exists');
  ok(/function renderQMArsenal\(/.test(html), 'renderQMArsenal function defined');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
