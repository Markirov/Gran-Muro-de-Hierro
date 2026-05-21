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

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: botones export en modal replay', () => {
  ok(!!doc.getElementById('btn-lab2-replay-export-png'),
     '#btn-lab2-replay-export-png presente');
  ok(!!doc.getElementById('btn-lab2-replay-export-json'),
     '#btn-lab2-replay-export-json presente');
});

group('Group 2: handlers wired al script', () => {
  ok(/btn-lab2-replay-export-png/.test(html), 'PNG handler referenciado');
  ok(/btn-lab2-replay-export-json/.test(html), 'JSON handler referenciado');
  ok(/toDataURL/.test(html), 'canvas.toDataURL usado');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
