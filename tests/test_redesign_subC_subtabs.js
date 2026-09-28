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

const JS_DIR = path.resolve(__dirname, '..', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const combinedJs = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const dom = new JSDOM(html.replace('</body>', '<script>' + combinedJs + '</script></body>'), { runScripts: 'outside-only' });
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
  ok(/setBandaSubtab/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'setBandaSubtab definido');
  ok(/getActiveBandaSubtab/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'getActiveBandaSubtab definido');
  ok(/renderShoppingSubtab/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'renderShoppingSubtab definido');
  ok(/wf\.ui\.bandaSubtab/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'localStorage key correcto');
  ok(/banda-subtab.*addEventListener/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))) || /querySelectorAll\('\.banda-subtab'\)/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'listeners click en subtabs');
});

group('Group 6: agrupación pool vs unit en render', () => {
  ok(/POOL DE BANDA/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'sección POOL DE BANDA');
  ok(/byModel/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'agrupación byModel');
  ok(/Hist[oó]rico/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'sección Histórico (tachados)');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
