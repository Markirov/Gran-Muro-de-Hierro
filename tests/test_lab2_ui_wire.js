/* Lab 2.0 — Sprint 8 — UI wire en pestaña Lab.
 *
 * Sobre Sprints 1-7. Añade botón en la UI del Lab para invocar
 * runBattleSeriesSpatial sin necesidad de tocar consola.
 *
 * UI agregada en la barra de modos del Lab (analyze / duel / compare /
 * loadout) como un quinto modo:
 *
 *  - Tab "🗺 Espacial" (data-mode="spatial").
 *  - Hint explicativo.
 *  - Panel #lab-spatial-panel con:
 *      - Selector de mapa (open-ground, ruined-village).
 *      - Input nBattles (default 50).
 *      - Input maxTurns (default 20).
 *      - Checkbox useCanonEngine.
 *      - Botón "Simular en mapa".
 *      - Div #lab-spatial-results para pintar el output.
 *  - Handler invoca runBattleSeriesSpatial con la banda actual como
 *    friendly Y enemy (mirror match V1 — el siguiente sprint añade
 *    selector de banda rival).
 *
 * Tests verifican que la UI está montada y el handler está wired.
 * No corre la simulación entera en el test (es lenta y requiere
 * DOM real); solo presencia + wire.
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

group('Group 1: tab Espacial presente con data-mode="spatial"', () => {
  const tab = doc.querySelector('.lab-mode-tab[data-mode="spatial"]');
  ok(!!tab, 'lab-mode-tab data-mode=spatial presente');
  if (tab) {
    const txt = tab.textContent.trim();
    ok(/espacial|spatial|mapa/i.test(txt),
       'texto tab incluye "Espacial"/"mapa" (got "' + txt + '")');
  }
});

group('Group 2: hint del modo spatial presente', () => {
  const hint = doc.querySelector('.lab-mode-hint[data-for="spatial"]');
  ok(!!hint, 'lab-mode-hint data-for=spatial presente');
  if (hint) {
    const txt = hint.textContent;
    ok(/mapa|posiciones|cover|LoS|tactical|espacial/i.test(txt),
       'hint menciona conciencia espacial');
  }
});

group('Group 3: opción "spatial" en hidden select lab-mode', () => {
  const select = doc.getElementById('lab-mode');
  ok(!!select, 'select lab-mode presente');
  if (select) {
    const opt = Array.from(select.options).find(o => o.value === 'spatial');
    ok(!!opt, 'option value=spatial en select');
  }
});

group('Group 4: panel #lab-spatial-panel presente', () => {
  const panel = doc.getElementById('lab-spatial-panel');
  ok(!!panel, '#lab-spatial-panel en DOM');
  if (panel) {
    // Default oculto hasta seleccionar el tab.
    const style = panel.getAttribute('style') || '';
    ok(/display:\s*none/.test(style), 'panel oculto por defecto');
  }
});

group('Group 5: selector de mapa con open-ground + ruined-village', () => {
  const sel = doc.getElementById('lab-spatial-map');
  ok(!!sel, '#lab-spatial-map presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    ok(values.includes('open-ground'), 'option open-ground');
    ok(values.includes('ruined-village'), 'option ruined-village');
  }
});

group('Group 6: inputs nBattles + maxTurns + checkbox useCanonEngine', () => {
  const nB = doc.getElementById('lab-spatial-nbattles');
  ok(!!nB, '#lab-spatial-nbattles input presente');
  if (nB) ok(nB.getAttribute('type') === 'number', 'type=number');
  const mT = doc.getElementById('lab-spatial-max-turns');
  ok(!!mT, '#lab-spatial-max-turns input presente');
  const canon = doc.getElementById('lab-spatial-canon');
  ok(!!canon, '#lab-spatial-canon checkbox presente');
  if (canon) ok(canon.getAttribute('type') === 'checkbox', 'type=checkbox');
});

group('Group 7: botón Run + div de resultados', () => {
  ok(!!doc.getElementById('btn-lab-spatial-run'), '#btn-lab-spatial-run presente');
  ok(!!doc.getElementById('lab-spatial-results'), '#lab-spatial-results presente');
});

group('Group 8: handler JS wired al botón', () => {
  ok(/btn-lab-spatial-run['"]\)\?\.addEventListener|getElementById\(['"]btn-lab-spatial-run['"]\)\.addEventListener/.test(html),
     'handler getElementById(btn-lab-spatial-run).addEventListener presente');
  ok(/runBattleSeriesSpatial/.test(html),
     'cuerpo del script referencia runBattleSeriesSpatial');
});

group('Group 9: mode toggle handler maneja modo spatial', () => {
  // El handler change del lab-mode select debe mostrar/ocultar el panel.
  const slice = html.slice(html.indexOf("document.getElementById('lab-mode')?.addEventListener('change'"));
  ok(/spatial/.test(slice.slice(0, 2000)),
     'change handler maneja mode=spatial');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
