/* SPEC-rediseno-ui Sub-D — Botones banda + "🛒 + Lista pool".
 *
 * Verifica:
 * - Botón btn-add-pool-shopping en cabecera banda
 * - Clase .btn-pool-shopping acento verde
 * - Handler invoca modal shopping existente
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

group('Group 1: Botón "+ Lista pool" en DOM', () => {
  const btn = doc.getElementById('btn-add-pool-shopping');
  ok(!!btn, 'btn-add-pool-shopping presente');
  ok(btn.classList.contains('btn-pool-shopping'), 'clase btn-pool-shopping');
  ok(/Lista pool/i.test(btn.textContent), 'texto "Lista pool"');
});

group('Group 2: Estilo verde acento', () => {
  ok(/\.btn-pool-shopping\s*\{[^}]*border-left:\s*3px\s*solid\s*#4a8a3a/m.test(html),
     'border-left verde declarado');
});

group('Group 3: Botones promotion-step en mismo bloque', () => {
  // Conviven en mismo padre budget-display.
  const budget = doc.getElementById('budget-display-block');
  ok(!!budget, 'budget-display-block presente');
  const poolBtn = doc.getElementById('btn-add-pool-shopping');
  ok(poolBtn && budget.contains(poolBtn),
     'btn-add-pool-shopping dentro de budget-display-block');
});

group('Group 4: Handler abre modal Sub-E modo pool', () => {
  ok(/btn-add-pool-shopping.*addEventListener/s.test(html), 'listener wired');
  ok(/openAddShoppingModal\(STATE\.currentWarband,\s*'pool',\s*null\)/.test(html),
     "invoca openAddShoppingModal mode=pool");
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
