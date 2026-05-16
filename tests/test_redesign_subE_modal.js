/* SPEC-rediseno-ui Sub-E — Modal "Añadir a wishlist" con categorías.
 *
 * Verifica:
 * - modal-add-shopping-cat presente con tabs + items containers
 * - Helpers openAddShoppingModal + renderAddShoppingTabs + renderAddShoppingItems
 * - SHOPPING_CAT_LABELS define las 6 categorías canon
 * - _getShoppingCategoryItems modo pool vs unit
 * - Botón Sub-D y Sub-F invocan openAddShoppingModal con mode correcto
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: Modal DOM presente', () => {
  ok(!!doc.getElementById('modal-add-shopping-cat'), 'modal presente');
  ok(!!doc.getElementById('add-shopping-title'), 'título dinámico');
  ok(!!doc.getElementById('add-shopping-subtitle'), 'subtítulo dinámico');
  ok(!!doc.getElementById('add-shopping-cat-tabs'), 'container tabs');
  ok(!!doc.getElementById('add-shopping-items'), 'container items');
});

group('Group 2: Helpers JS definidos', () => {
  ok(/function openAddShoppingModal/.test(html), 'openAddShoppingModal');
  ok(/function renderAddShoppingTabs/.test(html), 'renderAddShoppingTabs');
  ok(/function renderAddShoppingItems/.test(html), 'renderAddShoppingItems');
  ok(/_getShoppingCategoryItems/.test(html), '_getShoppingCategoryItems');
});

group('Group 3: SHOPPING_CAT_LABELS 6 categorías canon', () => {
  ok(/SHOPPING_CAT_LABELS/.test(html), 'constante declarada');
  for (const cat of ['ranged','melee','grenades','shields','armour','equipment']) {
    ok(new RegExp("'" + cat + "'").test(html), 'categoría ' + cat);
  }
});

group('Group 4: Filtrado pool vs unit', () => {
  ok(/ctx\.mode === 'pool'/.test(html), 'rama mode==pool');
  ok(/classifyBattlekitItem/.test(html), 'usa classifyBattlekitItem para filtro unit');
});

group('Group 5: Sub-D + Sub-F invocan openAddShoppingModal', () => {
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'pool'/.test(html),
     'Sub-D pasa mode=pool');
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'unit'/.test(html),
     'Sub-F pasa mode=unit');
});

group('Group 6: Acción "Añadir" persiste con scope correcto', () => {
  ok(/data-add-shopping-from-cat/.test(html), 'data-attr en botones Add');
  ok(/scope:\s*ctx\.mode/.test(html), 'scope toma mode del ctx');
  ok(/forModel:\s*\(ctx\.mode === 'unit'\) \? ctx\.targetModelUid : null/.test(html),
     'forModel solo en modo unit');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
