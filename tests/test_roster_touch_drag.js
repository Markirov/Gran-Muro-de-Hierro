/* Touch drag&drop para roster (mobile).
 *
 * SPEC rediseño UI Sub-I añadió HTML5 drag&drop nativo para desktop. Sin
 * soporte touch. Este sprint añade touchstart/touchmove/touchend handlers
 * que mirroran la lógica del drag&drop desktop:
 *  - touchstart en .roster-card: marca draggedUid + clase 'dragging'.
 *  - touchmove: elementFromPoint busca card debajo del touch; calcula
 *    posición before/after según midpoint Y; añade clase drop-target-*.
 *  - touchend: invoca reorderWarbandModelByUid + renderAll + cleanup.
 *
 * Tests verifican presencia de handlers + reuso del helper canon.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: handlers touch* declarados en script', () => {
  ok(/touchstart/.test(html), 'touchstart handler presente');
  ok(/touchmove/.test(html), 'touchmove handler presente');
  ok(/touchend/.test(html), 'touchend handler presente');
});

group('Group 2: touch handlers usan reorderWarbandModelByUid', () => {
  // Busca touchend handler + reorder dentro de los siguientes 1500 chars.
  const idx = html.search(/touchend['"]/);
  ok(idx >= 0, 'touchend localizado');
  if (idx >= 0) {
    const slice = html.slice(idx, idx + 1500);
    ok(/reorderWarbandModelByUid/.test(slice),
       'touchend invoca reorderWarbandModelByUid (reusa helper desktop)');
  }
});

group('Group 3: touch handlers usan elementFromPoint para hit-test', () => {
  // touchmove necesita elementFromPoint para saber qué card está debajo.
  ok(/elementFromPoint/.test(html),
     'elementFromPoint presente (hit-test touch)');
});

group('Group 4: passive:false declarado en touchmove (preventDefault)', () => {
  // touchmove debe usar { passive: false } o equivalente para poder
  // preventDefault y evitar scroll mientras se arrastra.
  ok(/passive:\s*false/.test(html) || /preventDefault/.test(html),
     'passive:false o preventDefault presente');
});

group('Group 5: clase CSS .dragging existe (visual durante drag)', () => {
  ok(/\.roster-card\.dragging/.test(html) || /\.dragging\s*\{/.test(html),
     'estilo .dragging definido');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
