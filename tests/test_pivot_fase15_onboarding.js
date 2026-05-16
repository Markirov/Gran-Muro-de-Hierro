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

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

const dom = new JSDOM(html, { runScripts: 'outside-only' });
const doc = dom.window.document;

group('Group 1: modal-welcome presente', () => {
  ok(!!doc.getElementById('modal-welcome'), 'modal-welcome');
  ok(!!doc.getElementById('btn-welcome-dismiss'), 'btn-welcome-dismiss');
  ok(!!doc.getElementById('btn-show-welcome'), 'btn-show-welcome (header)');
});

group('Group 2: copy clave del tour', () => {
  ok(/Companion offline/i.test(html), 'tagline "Companion offline"');
  ok(/Trench Companion.*construye/i.test(html), '"Trench Companion construye"');
  ok(/Warband Forge.*lleva.*mesa/i.test(html), '"lleva a la mesa"');
  ok(/Flujo t.pico/i.test(html), 'sección "Flujo típico"');
  ok(/Post Game Reporter/i.test(html), 'menciona Post Game Reporter');
});

group('Group 3: pasos del flujo en el tour', () => {
  // Pasos clave del flujo.
  ok(/construye tu banda en/i.test(html) || /1\.\s*Construye/i.test(html), 'paso construir en TC');
  ok(/Exporta el JSON/i.test(html), 'paso exportar');
  ok(/[Ii]mp[oó]rtala en Warband Forge/i.test(html), 'paso importar Forge');
  ok(/Variantes/i.test(html), 'paso Variantes');
  ok(/Lista compra/i.test(html), 'paso Lista compra');
  ok(/Tarjetas/i.test(html), 'paso Tarjetas físicas');
  ok(/Lab/i.test(html), 'paso Lab');
});

group('Group 4: persistencia primera visita', () => {
  ok(/wf-tour-seen/.test(html), 'localStorage flag wf-tour-seen');
  // Auto-show del modal welcome reemplazado por disclaimer fan-made
  // (toast 2s). Modal welcome sigue accesible desde menú config (⚙).
  ok(/autoShowDisclaimerFirstVisit|wf-disclaimer-seen/.test(html),
     'disclaimer fan-made auto-show sustituye al welcome auto-show');
  ok(/localStorage\.setItem\(WELCOME_FLAG_KEY/.test(html), 'guarda flag tras dismiss');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
