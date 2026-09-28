/* Lab 2.0 — Sprint 32 — Export replay (PNG actual + JSON completo).
 *
 * Sin librerías externas (single-file constraint):
 *  - Botón "📥 PNG frame" en modal replay: canvas.toDataURL('image/png')
 *    → descarga PNG del frame actual.
 *  - Botón "📥 JSON replay" en modal replay: JSON.stringify(LAB2_LAST_REPLAY)
 *    → descarga .json para re-load externo (futuro).
 *
 * Sin animated GIF (necesitaría lib gif.js). Sin WebM video (MediaRecorder
 * funciona pero V1 mantiene scope mínimo).
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

group('Group 1: botones export en modal replay', () => {
  ok(!!doc.getElementById('btn-lab2-replay-export-png'),
     '#btn-lab2-replay-export-png presente');
  ok(!!doc.getElementById('btn-lab2-replay-export-json'),
     '#btn-lab2-replay-export-json presente');
});

group('Group 2: handlers wired al script', () => {
  ok(/btn-lab2-replay-export-png/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'PNG handler referenciado');
  ok(/btn-lab2-replay-export-json/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'JSON handler referenciado');
  ok(/toDataURL/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'canvas.toDataURL usado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
