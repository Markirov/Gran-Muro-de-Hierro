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

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: botones + modal sandbox presentes', () => {
  ok(!!doc.getElementById('btn-open-sandbox'), 'btn-open-sandbox en header');
  ok(!!doc.getElementById('modal-sandbox'), 'modal-sandbox presente');
  ok(!!doc.getElementById('sandbox-variants-list'), 'lista variantes presente');
  ok(!!doc.getElementById('sandbox-new-variant-name'), 'input nombre nueva variante');
  ok(!!doc.getElementById('btn-sandbox-create'), 'btn crear variante');
});

group('Group 2: handlers Fase 12-B wired en script', () => {
  ok(/renderSandboxList/.test(html), 'renderSandboxList definido');
  ok(/btn-open-sandbox.*click/.test(html), 'btn-open-sandbox listener');
  ok(/btn-sandbox-create.*click/.test(html), 'btn-sandbox-create listener');
  ok(/data-sandbox-promote/.test(html), 'delegation promote');
  ok(/data-sandbox-delete/.test(html), 'delegation delete');
  ok(/promoteVariantToShoppingList\(/.test(html), 'promote helper invocado');
  ok(/removeVariant\(/.test(html), 'removeVariant invocado');
  ok(/createVariant\(/.test(html), 'createVariant invocado');
});

group('Group 3: filosofía sandbox visible en copy UI', () => {
  ok(/banda canon/i.test(html), 'menciona "banda canon"');
  ok(/Trench Companion.*verdad oficial/i.test(html) || /verdad oficial/i.test(html),
     'menciona "verdad oficial"');
});

group('Group 4: Sub-Fase 12-C editor overrides wired', () => {
  ok(/data-sandbox-edit/.test(html), 'botón editar variantes');
  ok(/data-sandbox-duplicate/.test(html), 'botón duplicar variantes');
  ok(/data-sandbox-save-overrides/.test(html), 'botón guardar overrides');
  ok(/data-sandbox-overrides-json/.test(html), 'textarea JSON overrides');
  ok(/Schema:.*add-equipment/.test(html), 'leyenda schema visible');
});

group('Group 5: Sub-Fase 12-D integración Lab wired', () => {
  ok(/data-sandbox-compare/.test(html), 'botón comparar Lab presente');
  ok(/compareVariantVsCanon\(/.test(html), 'helper compareVariantVsCanon invocado');
  ok(/Simulando/i.test(html), 'feedback "Simulando..."');
  ok(/canon mejor|variante mejor/i.test(html), 'render diff por enemigo');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
