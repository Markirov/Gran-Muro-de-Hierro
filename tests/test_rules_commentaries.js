/* Developer Rules Commentaries 1.0.2 (págs. 17-26 del PDF de FAQ, erratas y
 * revisión de abril 2026): las aclaraciones que tocan textos de la app.
 * Las de keywords (Keywords Q1-Q10) ya están como notas de KEYWORD_GLOSSARY.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { ABILITY_LIBRARY, EQUIPMENT_IMPLICIT_ABILITIES, KEYWORD_GLOSSARY };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
const A = (n) => (X.ABILITY_LIBRARY[n] || {}).summary || '';
// Habilidades de campaña: están en el HTML como { name, summary }.
const skill = (n) => {
  const q = n.includes("'") ? '"' : "'";
  const re = new RegExp('name:\\s*' + q + n + q + ',\\s*summary:\\s*');
  const m = re.exec(html);
  if (!m) return '';
  const start = m.index + m[0].length + 1;
  return html.slice(start, html.indexOf("',", start));
};

console.log('\nGroup 1: facciones');
ok(/Broken on the Wheel/.test(A('Resurrection')), 'Trench Pilgrims Q1: no resucita quien murió Broken on the Wheel');
ok(/Shield/.test(A('Crushing Blows')), 'Black Grail Q1: Crushing Blows también con Shield');
ok(/BLAST/.test(A('Stealth Generator')), 'Heretic Legions Q2: Stealth Generator y BLAST a un punto');
ok(/activación/.test(A('Black Heart')) && /fuera de tu activación/.test(A('Black Heart')), 'The Court Q2: Black Heart una vez por activación, fuera de ella en cada tirada');

console.log('\nGroup 2: campaña');
ok(/Automatic Pistol|AUTOMATIC/.test(skill('Gunslinger')) && /cuerpo a cuerpo/.test(skill('Gunslinger')), 'Campaigns Q2 y Q6: Gunslinger');
ok(/modificadores de un Melee Attack/.test(skill('Point Blank')), 'Campaigns Q7: Point Blank usa los modificadores de Melee');
ok(/variante/.test(skill('Logistical Skills')), 'Campaigns Q4: Logistical Skills en bandas de variante');
ok(/variante/.test(skill("Sultan's Favour")), "Campaigns Q4: Sultan's Favour en bandas de variante");

console.log('\nGroup 3: varios');
ok((X.EQUIPMENT_IMPLICIT_ABILITIES['Musical Instrument'] || []).some(a => /él mismo|incluido el portador/.test(a.desc)), 'Misc Q2: el portador del Musical Instrument también se beneficia');
const strong = X.KEYWORD_GLOSSARY.find(e => e.key === 'STRONG') || {};
ok(/Shovel/.test(strong.note || ''), 'Battlekit Q2: STRONG usa la Shovel como arma a 1 mano');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
