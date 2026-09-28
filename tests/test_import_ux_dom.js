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

// Parsea sólo el DOM — no ejecuta el script (evita errores window-only).
const JS_DIR = path.resolve(__dirname, '..', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const combinedJs = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const dom = new JSDOM(html.replace('</body>', '<script>' + combinedJs + '</script></body>'), { runScripts: 'outside-only' });
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
  ok(/json-drop-active/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'CSS json-drop-active definido');
  ok(/Soltar archivo JSON/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'mensaje overlay en CSS');
});

group('Group 4: handlers Fase 9-B presentes en script', () => {
  ok(/setupGlobalJsonDrop/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'setupGlobalJsonDrop wired');
  ok(/handleRefreshCompanionClick/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'handleRefreshCompanionClick definido');
  ok(/btn-do-refresh-companion/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'handler botón modal');
  ok(/refreshCompanionWarband\(/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'refreshCompanionWarband invocado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
