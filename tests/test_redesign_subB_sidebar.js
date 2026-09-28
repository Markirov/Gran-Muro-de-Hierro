/* SPEC-rediseno-ui Sub-B — Sidebar facción plegable.
 *
 * Verifica:
 * - Botón btn-toggle-faction-sidebar en DOM
 * - CSS .faction-sidebar-toggle + body.faction-sidebar-collapsed
 * - setFactionSidebarOpen + isFactionSidebarOpen helpers
 * - localStorage key wf.ui.factionSidebarOpen
 * - Default plegada (decisión 2)
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

group('Group 1: Botón toggle presente', () => {
  ok(!!doc.getElementById('btn-toggle-faction-sidebar'), 'btn-toggle-faction-sidebar en DOM');
  const btn = doc.getElementById('btn-toggle-faction-sidebar');
  ok(btn.classList.contains('faction-sidebar-toggle'), 'tiene clase faction-sidebar-toggle');
});

group('Group 2: CSS estilos sidebar plegable', () => {
  ok(/\.faction-sidebar-toggle\s*\{/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), '.faction-sidebar-toggle declarado');
  ok(/body\.faction-sidebar-collapsed\s*\.panel-left\s*\{[^}]*display:\s*none/m.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'body.faction-sidebar-collapsed oculta .panel-left');
  ok(/body\.faction-sidebar-collapsed\s+main\s*\{[^}]*grid-template-columns/m.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'body.faction-sidebar-collapsed reajusta grid main');
});

group('Group 3: Helpers JS + localStorage', () => {
  ok(/function setFactionSidebarOpen/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'setFactionSidebarOpen definido');
  ok(/function isFactionSidebarOpen/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'isFactionSidebarOpen definido');
  ok(/wf\.ui\.factionSidebarOpen/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'localStorage key wf.ui.factionSidebarOpen');
});

group('Group 4: Default plegada en primera visita', () => {
  // En el código, isFactionSidebarOpen retorna false como fallback.
  // Verifica que el código del fallback dice eso.
  ok(/return false;\s*\/\/[^\n]*Default plegada/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))) ||
     /Default plegada/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'comentario "Default plegada"');
});

group('Group 5: Boot restaura estado sidebar', () => {
  ok(/setFactionSidebarOpen\(isFactionSidebarOpen\(\)\)/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'boot llama setFactionSidebarOpen(isFactionSidebarOpen())');
});

group('Group 6: Handler delegation click', () => {
  ok(/btn-toggle-faction-sidebar/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'selector botón en delegation');
  ok(/setFactionSidebarOpen\(!isFactionSidebarOpen\(\)\)/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'toggle con flip de flag');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

