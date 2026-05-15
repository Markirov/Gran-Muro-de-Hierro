/* Regresión bug House of Wisdom typo.
 *
 * variantId canónico: 'house-wisdom' (sin 'of'). Ver línea 5396 (def) y
 * 7395 (Companion mapping). Cualquier string 'house-of-wisdom' en el
 * archivo es un typo latente que rompe comparaciones futuras contra
 * wb.variantId.
 *
 * Cobertura:
 * 1) Source HTML no contiene 'house-of-wisdom' (regex literal).
 * 2) CAMPAIGN_TABLES roll 12 (Jabirean Alchemical Book) opción 'study'
 *    usa variantsAllowed con la key canon.
 * 3) Source unlock-named-battlekit usa 'house-wisdom-armoury'.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: source sin "house-of-wisdom"', () => {
  const matches = html.match(/house-of-wisdom/g);
  ok(!matches, 'cero ocurrencias del typo (got ' + (matches ? matches.length : 0) + ')');
});

group('Group 2: source contiene la key canónica', () => {
  // Mapping Companion + VARIANT_PALETTES + VARIANT_FACTION_RULES + restriction.
  const matches = html.match(/'house-wisdom'/g) || [];
  ok(matches.length >= 3,
     "≥3 ocurrencias literales de 'house-wisdom' (got " + matches.length + ')');
  // Armoury source también unificado.
  ok(/house-wisdom-armoury/.test(html), "incluye 'house-wisdom-armoury'");
});

group('Group 3: option Jabirean Book "study" usa variantsAllowed canon', () => {
  // Mira el bloque del roll 12 — específicamente la línea con variantsAllowed.
  const studyMatch = html.match(/variantsAllowed:\s*\[['"]([^'"]+)['"]\]/);
  ok(studyMatch && studyMatch[1] === 'house-wisdom',
     "variantsAllowed: ['house-wisdom'] (got " + (studyMatch ? studyMatch[1] : 'no match') + ')');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
