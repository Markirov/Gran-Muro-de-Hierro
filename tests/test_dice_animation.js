/* Test for animación dados Exploration (cosmético)
 *
 * Smoke check: dados renderizados como spans individuales con clase
 * .expl-die y keyframes CSS .expl-die-roll definidos.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: CSS keyframes + class', () => {
  ok(/\.expl-die\b/.test(html), '.expl-die class defined');
  ok(/@keyframes\s+expl-die-roll/.test(html), 'keyframes expl-die-roll defined');
});

group('Group 2: render usa spans .expl-die', () => {
  // The exploration render emits expl-die spans (the string is built
  // inside renderWizardExploration when rendering r.dice).
  ok(/expl-die/.test(html), 'expl-die referenced in render');
  // Glyphs map (⚀⚁⚂⚃⚄⚅) should appear in the render template.
  ok(/⚀.*⚁.*⚂.*⚃.*⚄.*⚅/.test(html), 'D6 glyph array present');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
