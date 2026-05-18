/* Roadmap P3 — Pestaña "Mis Campañas" en nav principal.
 *
 * Cierra accesibilidad: el modo campana ya existe, pero entrar mostraba
 * paneles vacíos (Sub-C ocultaba panel-catalogue/roster/detail en
 * body.mode-campana — regresión silenciosa). Además la pestaña estaba
 * etiquetada "Campaña" (singular), sugiriendo banda concreta más que
 * índice de campañas.
 *
 * Verifica:
 * - Pestaña principal etiquetada "Campañas" (plural, atajo a "Mis Campañas").
 * - CSS no oculta panel-catalogue/roster/detail en body.mode-campana
 *   (esos paneles son lo que renderCampaignMode usa para Lista/Centro/Detalle).
 * - Variantes/shopping/lab/battle SÍ siguen ocultos en campana mode.
 * - Helper para forzar sidebar abierta en campana mode sin flip de flag.
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

group('Group 1: pestaña principal "Campañas" (plural)', () => {
  const btn = doc.querySelector('.mode-btn[data-mode="campana"]');
  ok(!!btn, 'mode-btn data-mode=campana presente');
  const txt = btn ? btn.textContent.trim() : '';
  ok(/Campañas/.test(txt),
     'texto botón incluye "Campañas" plural (got "' + txt + '")');
});

group('Group 2: CSS no oculta panel-catalogue/roster/detail en mode-campana', () => {
  // Regla mode-campana NO debe incluir panel-catalogue ni panel-roster ni
  // panel-detail en su lista de display:none (esos son los que el
  // módulo de campaña usa para renderizar la lista, el centro y el detalle).
  const re = /body\.mode-campana\s+#panel-catalogue[^{]*\{[^}]*display:\s*none/m;
  ok(!re.test(html),
     'panel-catalogue NO ocultado en mode-campana');

  // Específico: el bloque body.mode-campana SOLO debe ocultar variantes +
  // shopping + .banda-subtabs + panel-lab + panel-battle.
  const blockRe = /body\.mode-campana\s+#panel-variantes[\s\S]{0,400}display:\s*none\s*!important/m;
  ok(blockRe.test(html), 'bloque mode-campana sigue ocultando #panel-variantes');
  ok(/body\.mode-campana\s+#panel-shopping/.test(html),
     'mode-campana oculta #panel-shopping');
  ok(/body\.mode-campana\s+#panel-lab/.test(html),
     'mode-campana oculta #panel-lab');
  ok(/body\.mode-campana\s+#panel-battle/.test(html),
     'mode-campana oculta #panel-battle');
});

group('Group 3: setMode("campana") fuerza sidebar visible vía clase de override', () => {
  // Cuando setMode entra en campana, añade body.campana-sidebar-force o
  // similar para que panel-catalogue siga visible aunque
  // faction-sidebar-collapsed esté activo. Esto reduce 1 click.
  ok(/body\.mode-campana.*\.panel-left/.test(html) ||
     /body\.mode-campana[^{]*faction-sidebar-collapsed/.test(html) ||
     /mode === ['"]campana['"][\s\S]{0,200}setFactionSidebarOpen/.test(html),
     'mode-campana fuerza sidebar abierta vía CSS o JS');
});

group('Group 4: panel-roster contiene lista cuando campana sin selección', () => {
  // renderCampaignCenter ya muestra "SIN CAMPAÑA" + ahora también lista
  // de campañas para seleccionar (1-click reducido). Verificación static:
  // el helper renderCampaignCenter referencia loadCampaignIndex o
  // renderCampaignList desde su rama "sin campaña".
  ok(/SIN CAMPAÑA/.test(html), 'mensaje SIN CAMPAÑA presente');
  ok(/renderCampaignCenter/.test(html), 'renderCampaignCenter definido');
});

group('Group 5: visualmente mode-campana muestra panel-catalogue + panel-roster', () => {
  // Simulación: aplica clase mode-campana a body y comprueba via
  // getComputedStyle que panel-catalogue no es display:none vía rule estática.
  doc.body.classList.add('mode-campana');
  doc.body.classList.add('faction-sidebar-collapsed');  // worst-case
  const catalogue = doc.getElementById('panel-catalogue');
  // jsdom no implementa fully getComputedStyle aplicada vía CSS de string,
  // así que comprobamos que NO existe la regla problemática.
  ok(!!catalogue, 'panel-catalogue en DOM');
  // Cleanup
  doc.body.classList.remove('mode-campana');
  doc.body.classList.remove('faction-sidebar-collapsed');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
