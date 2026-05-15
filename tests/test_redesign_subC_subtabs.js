/* SPEC-rediseno-ui Sub-C — sub-tabs BANDA (Roster / Variantes / Lista compra).
 *
 * Verifica:
 * - Nav banda-subtabs presente con 3 botones
 * - Atributos data-subtab + active default = Roster
 * - Panel-fullwidth #panel-variantes + #panel-shopping presentes
 * - data-subtab-panel correctos en roster, detail, variantes, shopping
 * - Handlers wired (setBandaSubtab, renderShoppingSubtab)
 * - localStorage key wf.ui.bandaSubtab
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

group('Group 1: Nav sub-tabs presente', () => {
  const nav = doc.getElementById('banda-subtabs');
  ok(!!nav, 'banda-subtabs presente');
  const btns = doc.querySelectorAll('.banda-subtab');
  ok(btns.length === 3, '3 botones sub-tab');
  const tabs = Array.from(btns).map(b => b.getAttribute('data-subtab'));
  ok(tabs.includes('roster'), 'tab roster');
  ok(tabs.includes('variantes'), 'tab variantes');
  ok(tabs.includes('shopping'), 'tab shopping');
});

group('Group 2: Roster activo por defecto', () => {
  const active = doc.querySelector('.banda-subtab.active');
  ok(!!active, 'hay tab activa');
  ok(active.getAttribute('data-subtab') === 'roster', 'roster activa default');
  ok(active.getAttribute('aria-selected') === 'true', 'aria-selected true');
});

group('Group 3: Panels nuevos presentes', () => {
  ok(!!doc.getElementById('panel-variantes'), 'panel-variantes presente');
  ok(!!doc.getElementById('panel-shopping'), 'panel-shopping presente');
  ok(!!doc.getElementById('shopping-subtab-content'), 'container content shopping');
  ok(!!doc.getElementById('btn-shopping-subtab-add'), 'btn añadir');
  ok(!!doc.getElementById('btn-shopping-subtab-pdf'), 'btn PDF');
  ok(!!doc.getElementById('btn-shopping-subtab-clear'), 'btn clear');
});

group('Group 4: data-subtab-panel correctos', () => {
  const roster = doc.getElementById('panel-roster');
  const detail = doc.getElementById('panel-detail');
  ok(roster && roster.getAttribute('data-subtab-panel') === 'roster', 'roster panel marcado');
  ok(detail && detail.getAttribute('data-subtab-panel') === 'roster', 'detail panel marcado roster');
  ok(doc.getElementById('panel-variantes').getAttribute('data-subtab-panel') === 'variantes',
     'variantes panel marcado');
  ok(doc.getElementById('panel-shopping').getAttribute('data-subtab-panel') === 'shopping',
     'shopping panel marcado');
});

group('Group 5: handlers wired en script', () => {
  ok(/setBandaSubtab/.test(html), 'setBandaSubtab definido');
  ok(/getActiveBandaSubtab/.test(html), 'getActiveBandaSubtab definido');
  ok(/renderShoppingSubtab/.test(html), 'renderShoppingSubtab definido');
  ok(/wf\.ui\.bandaSubtab/.test(html), 'localStorage key correcto');
  ok(/banda-subtab.*addEventListener/.test(html) || /querySelectorAll\('\.banda-subtab'\)/.test(html),
     'listeners click en subtabs');
});

group('Group 6: agrupación pool vs unit en render', () => {
  ok(/POOL DE BANDA/.test(html), 'sección POOL DE BANDA');
  ok(/byModel/.test(html), 'agrupación byModel');
  ok(/Hist[oó]rico/.test(html), 'sección Histórico (tachados)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
