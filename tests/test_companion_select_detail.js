/* Test bug fix: rosterCardCompanion click llama renderDetail.
 *
 * Marcos: "cuando cargo una banda y selecciono una unidad, no me deja
 * ver nada ni modificar". Bug en rosterCardCompanion (path Companion)
 * — click handler solo llamaba renderRoster sin renderDetail, por lo
 * que el panel detalle nunca se refrescaba al cambiar selección.
 *
 * Regression test: verifica que el código fuente referencia
 * renderDetail() en el handler del Companion card.
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

group('Group 1: rosterCardCompanion click handler llama renderDetail', () => {
  const idx = html.indexOf('function rosterCardCompanion');
  ok(idx > 0, 'rosterCardCompanion existe');
  // Encuentra el siguiente handler card.addEventListener('click'...)
  const slice = html.slice(idx, idx + 6000);
  // Match el patrón: STATE.selectedModelUid = model.uid; renderRoster(); renderDetail();
  ok(/STATE\.selectedModelUid\s*=\s*model\.uid;\s*renderRoster\(\);\s*renderDetail\(\);/.test(slice),
     'click handler invoca renderRoster() Y renderDetail() (Marcos bug fix)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
