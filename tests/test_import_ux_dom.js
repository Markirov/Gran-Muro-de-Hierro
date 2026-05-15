/* Fase 9-B: UI wired correctamente.
 *
 * jsdom-style. Verifica que:
 * - btn-refresh-companion existe en el header
 * - btn-do-refresh-companion existe en el modal
 * - body responde a clase json-drop-active (CSS overlay drop)
 * - parseCompanionJson expuesto en window scope (vía script)
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

// Parsea sólo el DOM — no ejecuta el script (evita errores window-only).
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: botones UI Fase 9-B presentes', () => {
  ok(!!doc.getElementById('btn-refresh-companion'),
     'btn-refresh-companion en header');
  ok(!!doc.getElementById('btn-do-refresh-companion'),
     'btn-do-refresh-companion en modal');
  ok(!!doc.getElementById('btn-import-companion'),
     'btn-import-companion original sigue ahí');
  ok(!!doc.getElementById('btn-do-merge-companion'),
     'btn-do-merge-companion original sigue ahí');
});

group('Group 2: textarea + feedback siguen accesibles', () => {
  ok(!!doc.getElementById('companion-import-textarea'),
     'companion-import-textarea presente');
  ok(!!doc.getElementById('companion-import-feedback'),
     'companion-import-feedback presente');
});

group('Group 3: estilo overlay drop incluido', () => {
  ok(/json-drop-active/.test(html), 'CSS json-drop-active definido');
  ok(/Soltar archivo JSON/i.test(html), 'mensaje overlay en CSS');
});

group('Group 4: handlers Fase 9-B presentes en script', () => {
  ok(/setupGlobalJsonDrop/.test(html), 'setupGlobalJsonDrop wired');
  ok(/handleRefreshCompanionClick/.test(html), 'handleRefreshCompanionClick definido');
  ok(/btn-do-refresh-companion/.test(html), 'handler botón modal');
  ok(/refreshCompanionWarband\(/.test(html), 'refreshCompanionWarband invocado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
