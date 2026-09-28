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

const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const combinedJs = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const dom = new JSDOM(html.replace('</body>', '<script>' + combinedJs + '</script></body>'), { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: Modal DOM presente', () => {
  ok(!!doc.getElementById('modal-add-shopping-cat'), 'modal presente');
  ok(!!doc.getElementById('add-shopping-title'), 'título dinámico');
  ok(!!doc.getElementById('add-shopping-subtitle'), 'subtítulo dinámico');
  ok(!!doc.getElementById('add-shopping-cat-tabs'), 'container tabs');
  ok(!!doc.getElementById('add-shopping-items'), 'container items');
});

group('Group 2: Helpers JS definidos', () => {
  ok(/function openAddShoppingModal/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'openAddShoppingModal');
  ok(/function renderAddShoppingTabs/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'renderAddShoppingTabs');
  ok(/function renderAddShoppingItems/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'renderAddShoppingItems');
  ok(/_getShoppingCategoryItems/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), '_getShoppingCategoryItems');
});

group('Group 3: SHOPPING_CAT_LABELS 6 categorías canon', () => {
  ok(/SHOPPING_CAT_LABELS/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'constante declarada');
  for (const cat of ['ranged','melee','grenades','shields','armour','equipment']) {
    ok(new RegExp("'" + cat + "'").test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'categoría ' + cat);
  }
});

group('Group 4: Filtrado pool vs unit', () => {
  ok(/ctx\.mode === 'pool'/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'rama mode==pool');
  ok(/classifyBattlekitItem/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'usa classifyBattlekitItem para filtro unit');
});

group('Group 5: Sub-D + Sub-F invocan openAddShoppingModal', () => {
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'pool'/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'Sub-D pasa mode=pool');
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'unit'/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'Sub-F pasa mode=unit');
});

group('Group 6: Acción "Añadir" persiste con scope correcto', () => {
  ok(/data-add-shopping-from-cat/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'data-attr en botones Add');
  ok(/scope:\s*ctx\.mode/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'scope toma mode del ctx');
  ok(/forModel:\s*\(ctx\.mode === 'unit'\) \? ctx\.targetModelUid : null/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'forModel solo en modo unit');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

