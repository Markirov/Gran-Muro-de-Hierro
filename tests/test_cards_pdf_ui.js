/* Fase 6: UI botones tarjetas/trackers PDF.
 * Smoke check de presencia en HTML.
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: botones presentes', () => {
  ok(html.includes('id="btn-cards-pdf"'), 'btn-cards-pdf existe');
  ok(html.includes('id="btn-trackers-pdf"'), 'btn-trackers-pdf existe');
  ok(/🃏\s*Tarjetas PDF/.test(html), 'label "🃏 Tarjetas PDF"');
  ok(/⊞\s*Battletrackers PDF/.test(html), 'label "⊞ Battletrackers PDF"');
});

group('Group 2: handlers cableados', () => {
  ok(/btn-cards-pdf['"]\)\?\.addEventListener/.test(html),
     'btn-cards-pdf handler cableado');
  ok(/btn-trackers-pdf['"]\)\?\.addEventListener/.test(html),
     'btn-trackers-pdf handler cableado');
  ok(/_downloadPdfBlob/.test(html), 'helper _downloadPdfBlob existe');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
