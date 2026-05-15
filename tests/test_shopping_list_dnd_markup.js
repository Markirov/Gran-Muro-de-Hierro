/* Test for Fase 6.4: Drag-and-drop reorder — markup smoke
 *
 * The reorder logic is already covered by test_shopping_list_model.js
 * (reorderShoppingList). 6.4 only adds the DOM wiring: rows are
 * draggable and carry data-drag-idx. We assert the wire-up exists.
 *
 * No new pure logic to test in isolation — the DnD event handlers
 * call reorderShoppingList which is already trusted.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: DnD wire-up in HTML', () => {
  // qmShoppingRows render output uses draggable + data-drag-idx
  ok(html.includes('data-drag-idx'), 'data-drag-idx attribute present');
  ok(/draggable="true"/.test(html), 'draggable="true" present somewhere');
  ok(html.includes('qm-shopping-row'), 'qm-shopping-row class used');
  ok(html.includes('dragstart') && html.includes('dragend') && html.includes('dragover') && html.includes('drop'),
     'all DnD event handlers referenced');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
