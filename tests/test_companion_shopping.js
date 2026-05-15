/* Test for BACKLOG P2/8: shopping toggle en Companion path
 *
 * Smoke check: renderDetailCompanion expone botones
 * data-shopping-toggle cuando el unit canon se resuelve. La lógica de
 * toggle pura está cubierta en test_shopping_list_detail_button.js.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: renderDetailCompanion expone shopping toggle', () => {
  // El render del path Companion debe contener la lógica de shopping
  // toggle. Buscamos referencias dentro del cuerpo de la función:
  const idx = html.indexOf('function renderDetailCompanion');
  ok(idx > 0, 'renderDetailCompanion exists');
  const after = html.slice(idx);
  ok(after.indexOf('data-shopping-toggle') < after.indexOf('function renderDetail('),
     'data-shopping-toggle aparece dentro de renderDetailCompanion');
  ok(after.indexOf('isInShoppingList(wb, model.uid') < after.indexOf('function renderDetail('),
     'isInShoppingList se llama con model.uid');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
