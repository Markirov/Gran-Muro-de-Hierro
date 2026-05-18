/* Roadmap alta prio — Banner Post Game Reporter en modal Nueva Campaña.
 *
 * Recomendar TC + Post Game Reporter como tracking oficial de XP/avances
 * cuando el usuario crea una campaña en Warband Forge (que solo trackea
 * resultados de forma local, no oficial).
 *
 * Verifica:
 * - Modal #modal-new-campaign contiene bloque .post-game-reporter-banner
 * - Banner menciona "Post Game Reporter"
 * - Banner enlaza a https://trench-companion.com
 * - Copy aclara que Warband Forge no sustituye tracking oficial
 * - Link tiene target=_blank + rel=noopener
 * - Banner aparece dentro del modal (no fuera)
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

group('Group 1: banner presente dentro del modal de nueva campaña', () => {
  const modal = doc.getElementById('modal-new-campaign');
  ok(!!modal, '#modal-new-campaign presente');
  const banner = modal && modal.querySelector('.post-game-reporter-banner');
  ok(!!banner, '.post-game-reporter-banner dentro del modal');
});

group('Group 2: copy del banner es informativo y canon', () => {
  const banner = doc.querySelector('#modal-new-campaign .post-game-reporter-banner');
  const txt = banner ? banner.textContent : '';
  ok(/Post Game Reporter/i.test(txt), 'menciona "Post Game Reporter"');
  ok(/Trench Companion|trench-companion\.com/i.test(txt), 'menciona Trench Companion');
  ok(/oficial/i.test(txt), 'menciona "oficial"');
  ok(/XP|avances|progresi[oó]n/i.test(txt), 'menciona XP/avances/progresión');
});

group('Group 3: link a TC bien formado', () => {
  const banner = doc.querySelector('#modal-new-campaign .post-game-reporter-banner');
  const link = banner && banner.querySelector('a[href*="trench-companion.com"]');
  ok(!!link, 'link a trench-companion.com presente');
  ok(link && link.getAttribute('target') === '_blank', 'target=_blank');
  ok(link && /noopener/.test(link.getAttribute('rel') || ''), 'rel=noopener');
});

group('Group 4: posicionamiento — banner antes de los inputs de creación', () => {
  const modal = doc.getElementById('modal-new-campaign');
  const banner = modal && modal.querySelector('.post-game-reporter-banner');
  const firstInput = modal && modal.querySelector('input, textarea');
  ok(!!banner && !!firstInput, 'banner + primer input ambos presentes');
  if (banner && firstInput) {
    const allEls = Array.from(modal.querySelectorAll('*'));
    const bannerIdx = allEls.indexOf(banner);
    const inputIdx = allEls.indexOf(firstInput);
    ok(bannerIdx < inputIdx, 'banner aparece antes del primer input');
  }
});

group('Group 5: clase CSS estiliza el banner', () => {
  ok(/\.post-game-reporter-banner\s*\{/.test(html),
     'regla CSS .post-game-reporter-banner definida');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
