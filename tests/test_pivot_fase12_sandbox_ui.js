/* Fase 12-B PIVOT v2 — Sandbox UI wired correctamente.
 *
 * jsdom-style. Verifica:
 * - Botón btn-open-sandbox en header
 * - Modal modal-sandbox con lista + input + botón crear
 * - Handlers wired (delegation + event listeners en script)
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

group('Group 1: botones + modal sandbox presentes', () => {
  ok(!!doc.getElementById('btn-open-sandbox'), 'btn-open-sandbox en header');
  ok(!!doc.getElementById('modal-sandbox'), 'modal-sandbox presente');
  ok(!!doc.getElementById('sandbox-variants-list'), 'lista variantes presente');
  ok(!!doc.getElementById('sandbox-new-variant-name'), 'input nombre nueva variante');
  ok(!!doc.getElementById('btn-sandbox-create'), 'btn crear variante');
});

group('Group 2: handlers Fase 12-B wired en script', () => {
  ok(/renderSandboxList/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'renderSandboxList definido');
  ok(/btn-open-sandbox.*click/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'btn-open-sandbox listener');
  ok(/btn-sandbox-create.*click/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'btn-sandbox-create listener');
  ok(/data-sandbox-promote/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'delegation promote');
  ok(/data-sandbox-delete/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'delegation delete');
  ok(/promoteVariantToShoppingList\(/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'promote helper invocado');
  ok(/removeVariant\(/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'removeVariant invocado');
  ok(/createVariant\(/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'createVariant invocado');
});

group('Group 3: filosofía sandbox visible en copy UI', () => {
  ok(/banda canon/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'menciona "banda canon"');
  ok(/Trench Companion.*verdad oficial/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))) || /verdad oficial/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'menciona "verdad oficial"');
});

group('Group 4: Sub-Fase 12-C editor overrides wired', () => {
  ok(/data-sandbox-edit/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'botón editar variantes');
  ok(/data-sandbox-duplicate/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'botón duplicar variantes');
  ok(/data-sandbox-save-overrides/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'botón guardar overrides');
  ok(/data-sandbox-overrides-json/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'textarea JSON overrides');
  ok(/Schema:.*add-equipment/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'leyenda schema visible');
});

group('Group 5: Sub-Fase 12-D integración Lab wired', () => {
  ok(/data-sandbox-compare/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'botón comparar Lab presente');
  ok(/compareVariantVsCanon\(/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'helper compareVariantVsCanon invocado');
  ok(/Simulando/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'feedback "Simulando..."');
  ok(/canon mejor|variante mejor/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'render diff por enemigo');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

