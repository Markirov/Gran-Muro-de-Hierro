/* Fase 15 PIVOT v2 — Onboarding tour + ayuda.
 *
 * Verifica:
 * - modal-welcome presente con copy clave
 * - Botón btn-show-welcome accesible siempre
 * - Botón btn-welcome-dismiss + flag localStorage
 * - Auto-show en primera visita (sin flag)
 * - Filosofía: "Trench Companion construye, Warband Forge lleva a mesa"
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

group('Group 1: modal-welcome presente', () => {
  ok(!!doc.getElementById('modal-welcome'), 'modal-welcome');
  ok(!!doc.getElementById('btn-welcome-dismiss'), 'btn-welcome-dismiss');
  ok(!!doc.getElementById('btn-show-welcome'), 'btn-show-welcome (header)');
});

group('Group 2: copy clave del tour', () => {
  ok(/Companion offline/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'tagline "Companion offline"');
  ok(/Trench Companion.*construye/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), '"Trench Companion construye"');
  ok(/Warband Forge.*lleva.*mesa/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), '"lleva a la mesa"');
  ok(/Flujo t.pico/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'sección "Flujo típico"');
  ok(/Post Game Reporter/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'menciona Post Game Reporter');
});

group('Group 3: pasos del flujo en el tour', () => {
  // Pasos clave del flujo.
  ok(/construye tu banda en/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))) || /1\.\s*Construye/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso construir en TC');
  ok(/Exporta el JSON/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso exportar');
  ok(/[Ii]mp[oó]rtala en Warband Forge/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso importar Forge');
  ok(/Variantes/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso Variantes');
  ok(/Lista compra/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso Lista compra');
  ok(/Tarjetas/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso Tarjetas físicas');
  ok(/Lab/i.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'paso Lab');
});

group('Group 4: persistencia primera visita', () => {
  ok(/wf-tour-seen/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'localStorage flag wf-tour-seen');
  // Auto-show del modal welcome reemplazado por disclaimer fan-made
  // (toast 2s). Modal welcome sigue accesible desde menú config (⚙).
  ok(/autoShowDisclaimerFirstVisit|wf-disclaimer-seen/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))),
     'disclaimer fan-made auto-show sustituye al welcome auto-show');
  ok(/localStorage\.setItem\(WELCOME_FLAG_KEY/.test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))), 'guarda flag tras dismiss');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

