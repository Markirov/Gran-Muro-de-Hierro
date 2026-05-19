/* Lab 2.0 — Sprint 12 — UI controles del replay 2D (modal + play/pause/step).
 *
 * Sobre Sprint 6 (buildBattleReplay + renderReplayFrame) + Sprint 8 (UI Lab).
 * Añade el wire UI completo para visualizar el último replay:
 *
 *  - Tras simular, el handler de "Simular en mapa" construye y guarda
 *    UN replay completo de la última batalla en variable global
 *    LAB2_LAST_REPLAY. Esto NO es persistente; vive sólo en memoria de
 *    la sesión del navegador (igual que LAB_DUEL_RIVAL en el Lab clásico).
 *  - Botón "🎬 Replay última batalla" en el panel espacial. Disabled
 *    hasta que LAB2_LAST_REPLAY tenga contenido.
 *  - Modal #modal-lab2-replay con canvas + slider de frame + botones:
 *     - ⏮ Inicio
 *     - ◀ Step prev
 *     - ▶ / ⏸ Play / Pause
 *     - Step next ▶
 *     - ⏭ Final
 *  - Auto-play opcional con setInterval (toggle vía botón Play).
 *
 * Tests verifican presencia de UI + wire JS. No corren la animación.
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

group('Group 1: botón replay en panel espacial', () => {
  const btn = doc.getElementById('btn-lab-spatial-replay');
  ok(!!btn, '#btn-lab-spatial-replay presente');
  if (btn) {
    const txt = btn.textContent.trim();
    ok(/replay|🎬|reproducir|ver/i.test(txt),
       'texto botón referencia replay (got "' + txt + '")');
  }
});

group('Group 2: modal #modal-lab2-replay presente', () => {
  const modal = doc.getElementById('modal-lab2-replay');
  ok(!!modal, '#modal-lab2-replay en DOM');
  if (modal) {
    ok(modal.querySelector('canvas') || doc.getElementById('lab2-replay-canvas'),
       'modal contiene canvas');
  }
});

group('Group 3: canvas con tamaño definido', () => {
  const cnv = doc.getElementById('lab2-replay-canvas');
  ok(!!cnv, '#lab2-replay-canvas presente');
  if (cnv) {
    const w = parseInt(cnv.getAttribute('width') || '0', 10);
    const h = parseInt(cnv.getAttribute('height') || '0', 10);
    ok(w > 0 && h > 0, 'canvas tiene width + height >0 (got ' + w + '×' + h + ')');
  }
});

group('Group 4: controles play/pause/step + slider de frame', () => {
  ok(!!doc.getElementById('btn-lab2-replay-prev'), 'botón prev');
  ok(!!doc.getElementById('btn-lab2-replay-next'), 'botón next');
  ok(!!doc.getElementById('btn-lab2-replay-play'), 'botón play/pause');
  ok(!!doc.getElementById('btn-lab2-replay-first'), 'botón inicio');
  ok(!!doc.getElementById('btn-lab2-replay-last'), 'botón final');
  const slider = doc.getElementById('lab2-replay-slider');
  ok(!!slider, 'slider de frame');
  if (slider) ok(slider.getAttribute('type') === 'range', 'slider type=range');
});

group('Group 5: handlers JS wired a controles', () => {
  ok(/getElementById\(['"]btn-lab-spatial-replay['"]\)\?\.addEventListener|btn-lab-spatial-replay['"]\)\.addEventListener/.test(html),
     'handler btn-lab-spatial-replay');
  ok(/LAB2_LAST_REPLAY/.test(html),
     'variable LAB2_LAST_REPLAY referenciada');
  ok(/renderReplayFrame/.test(html),
     'script invoca renderReplayFrame');
  ok(/btn-lab2-replay-play/.test(html),
     'handler botón play');
});

group('Group 6: run handler guarda LAB2_LAST_REPLAY tras simular', () => {
  // Busca específicamente el handler addEventListener para btn-lab-spatial-run.
  const handlerIdx = html.search(/btn-lab-spatial-run['"]\)\?\.addEventListener|btn-lab-spatial-run['"]\)\.addEventListener/);
  ok(handlerIdx >= 0, 'handler addEventListener de btn-lab-spatial-run localizado');
  if (handlerIdx >= 0) {
    const slice = html.slice(handlerIdx, handlerIdx + 4000);
    ok(/buildBattleReplay|LAB2_LAST_REPLAY\s*=/.test(slice),
       'cuerpo del handler invoca buildBattleReplay o asigna LAB2_LAST_REPLAY');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
