/* Roadmap baja prio — Limpieza top-bar global.
 *
 * El top-bar Banda tenía 15+ botones dispares. La sub-tarea de limpieza
 * (drawer mecánico ya existía vía hamburguesa ☰) faltaba agruparlos
 * semánticamente para reducir fatiga visual cuando el usuario abre el
 * menú.
 *
 * Verifica:
 * - Cada botón secundario del header tiene atributo data-action-group.
 * - Los 4 grupos canon están definidos en openHeaderDrawer: companion-tc,
 *   banda, forge-json, impresion.
 * - Helpers _appendDrawerButton + _appendDrawerHeader presentes.
 * - CSS .header-drawer-section define estilo distintivo.
 * - Botón nuevo btn-glossary-pdf está en grupo 'impresion'.
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

group('Group 1: cada secondary del header tiene data-action-group', () => {
  const actions = doc.getElementById('actions-banda');
  ok(!!actions, '#actions-banda presente');
  // Filtramos legacy ocultos (display:none) que el drawer también filtra.
  const allSec = actions.querySelectorAll('button.btn[data-action-priority="secondary"]');
  const secondaries = Array.from(allSec).filter(b => (b.getAttribute('style') || '').indexOf('display:none') === -1);
  ok(secondaries.length >= 8, '≥8 secondaries visibles en actions-banda (got ' + secondaries.length + ')');
  let missingGroup = 0;
  for (const b of secondaries) {
    if (!b.getAttribute('data-action-group')) {
      missingGroup++;
      console.log('    sin grupo: #' + b.id);
    }
  }
  ok(missingGroup === 0, 'todos los secondaries visibles tienen data-action-group');
});

group('Group 2: openHeaderDrawer define los 4 grupos canon', () => {
  const expected = ['companion-tc', 'banda', 'forge-json', 'impresion'];
  for (const g of expected) {
    ok(html.includes("'" + g + "'"),
       'grupo "' + g + '" presente en GROUP_LABELS');
  }
  ok(/GROUP_LABELS\s*=/.test(html), 'mapa GROUP_LABELS declarado');
});

group('Group 3: helpers _appendDrawerButton + _appendDrawerHeader', () => {
  ok(/function _appendDrawerButton/.test(html), '_appendDrawerButton definido');
  ok(/function _appendDrawerHeader/.test(html), '_appendDrawerHeader definido');
});

group('Group 4: drawer respeta orden semántico y separa primarios/secundarios', () => {
  // Primarios + sin grupo arriba; luego grupos por orden GROUP_LABELS.
  const idx = html.indexOf('openHeaderDrawer');
  ok(idx >= 0, 'openHeaderDrawer localizada');
  if (idx >= 0) {
    const snippet = html.slice(idx, idx + 4000);
    ok(/topLevel/.test(snippet), 'usa variable topLevel para sin-grupo');
    ok(/Object\.keys\(GROUP_LABELS\)/.test(snippet),
       'itera GROUP_LABELS en orden de declaración');
    ok(/extras|knownGroups/.test(snippet),
       'maneja grupos futuros no listados');
  }
});

group('Group 5: CSS .header-drawer-section estiliza headers', () => {
  ok(/\.header-drawer-section\s*\{/.test(html),
     'regla .header-drawer-section presente');
  ok(/\.header-drawer-section:first-child/.test(html),
     'first-child sin border-top (cosmético)');
});

group('Group 6: btn-glossary-pdf en grupo "impresion"', () => {
  const btn = doc.getElementById('btn-glossary-pdf');
  ok(!!btn, '#btn-glossary-pdf presente');
  if (btn) {
    ok(btn.getAttribute('data-action-group') === 'impresion',
       'data-action-group="impresion"');
  }
});

group('Group 7: distribución de grupos coherente', () => {
  const actions = doc.getElementById('actions-banda');
  const counts = {};
  actions.querySelectorAll('button.btn[data-action-group]').forEach(b => {
    const g = b.getAttribute('data-action-group');
    counts[g] = (counts[g] || 0) + 1;
  });
  ok((counts['companion-tc'] || 0) >= 1, 'companion-tc tiene ≥1 botón');
  ok((counts['banda'] || 0) >= 2, 'banda tiene ≥2 botones (Nueva/Cargar/Guardar)');
  ok((counts['forge-json'] || 0) === 2, 'forge-json tiene 2 botones (Import/Export)');
  ok((counts['impresion'] || 0) >= 4,
     'impresion tiene ≥4 botones (Imprimir/PDF/Cards/Trackers/Glosario)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
