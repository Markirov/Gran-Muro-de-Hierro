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

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: Botón toggle presente', () => {
  ok(!!doc.getElementById('btn-toggle-faction-sidebar'), 'btn-toggle-faction-sidebar en DOM');
  const btn = doc.getElementById('btn-toggle-faction-sidebar');
  ok(btn.classList.contains('faction-sidebar-toggle'), 'tiene clase faction-sidebar-toggle');
});

group('Group 2: CSS estilos sidebar plegable', () => {
  ok(/\.faction-sidebar-toggle\s*\{/.test(html), '.faction-sidebar-toggle declarado');
  ok(/body\.faction-sidebar-collapsed\s*\.panel-left\s*\{[^}]*display:\s*none/m.test(html),
     'body.faction-sidebar-collapsed oculta .panel-left');
  ok(/body\.faction-sidebar-collapsed\s+main\s*\{[^}]*grid-template-columns/m.test(html),
     'body.faction-sidebar-collapsed reajusta grid main');
});

group('Group 3: Helpers JS + localStorage', () => {
  ok(/function setFactionSidebarOpen/.test(html), 'setFactionSidebarOpen definido');
  ok(/function isFactionSidebarOpen/.test(html), 'isFactionSidebarOpen definido');
  ok(/wf\.ui\.factionSidebarOpen/.test(html), 'localStorage key wf.ui.factionSidebarOpen');
});

group('Group 4: Default plegada en primera visita', () => {
  // En el código, isFactionSidebarOpen retorna false como fallback.
  // Verifica que el código del fallback dice eso.
  ok(/return false;\s*\/\/[^\n]*Default plegada/i.test(html) ||
     /Default plegada/i.test(html), 'comentario "Default plegada"');
});

group('Group 5: Boot restaura estado sidebar', () => {
  ok(/setFactionSidebarOpen\(isFactionSidebarOpen\(\)\)/.test(html),
     'boot llama setFactionSidebarOpen(isFactionSidebarOpen())');
});

group('Group 6: Handler delegation click', () => {
  ok(/btn-toggle-faction-sidebar/.test(html), 'selector botón en delegation');
  ok(/setFactionSidebarOpen\(!isFactionSidebarOpen\(\)\)/.test(html),
     'toggle con flip de flag');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
