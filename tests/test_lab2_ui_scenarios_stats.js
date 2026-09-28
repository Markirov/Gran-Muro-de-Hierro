/* Lab 2.0 — Sprint 22 — UI wire scenario dropdown + stats graph en modal.
 *
 * Expone en la UI Lab los features de Sprint 19 (scenarios) + Sprint 20
 * (per-turn stats).
 *
 *  - Dropdown #lab-spatial-scenario en panel espacial. 4 opciones canon.
 *  - Run handler pasa opts.scenarioId al sim.
 *  - Canvas #lab2-stats-canvas en el modal de replay debajo del replay
 *    canvas, pintando avgAlivePerTurn de la última simulación.
 *  - Variable LAB2_LAST_STATS cachea avgAlivePerTurn tras run.
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

group('Group 1: dropdown scenario en panel espacial', () => {
  const sel = doc.getElementById('lab-spatial-scenario');
  ok(!!sel, '#lab-spatial-scenario presente');
  if (sel) {
    const values = Array.from(sel.options).map(o => o.value);
    for (const id of ['pitched-battle','breakthrough','hold-the-line','capture-point']) {
      ok(values.includes(id), 'option ' + id);
    }
  }
});

group('Group 2: canvas de stats graph en modal replay', () => {
  const cnv = doc.getElementById('lab2-stats-canvas');
  ok(!!cnv, '#lab2-stats-canvas presente en modal replay');
  if (cnv) {
    const w = parseInt(cnv.getAttribute('width') || '0', 10);
    const h = parseInt(cnv.getAttribute('height') || '0', 10);
    ok(w > 0 && h > 0, 'tamaño definido (got ' + w + '×' + h + ')');
  }
});

group('Group 3: handler de run lee dropdown scenario', () => {
  ok(/lab-spatial-scenario/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'script referencia lab-spatial-scenario');
  ok(/scenarioId/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'opts.scenarioId pasado al sim');
});

group('Group 4: handler de run cachea LAB2_LAST_STATS + render', () => {
  ok(/LAB2_LAST_STATS/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'variable LAB2_LAST_STATS referenciada');
  ok(/renderStatsGraph/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'script invoca renderStatsGraph');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

