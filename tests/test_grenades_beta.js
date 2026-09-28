/* Granadas según la revisión de reglas de abril 2026 (beta), canon de mesa
 * (decisión de Marcos, 2026-09-27). Fuente:
 * trenchcrusade.com/trench-wire/rules/grenade-rules-update/ (tarjetas Grenades-1..6).
 * - FUMBLE (nueva keyword) en Frag, Gas, Incendiary, Molotov Cocktail y
 *   Parasite Grenades (Demonic Aura Grenade y Holy Grenade no están en la app);
 *   Satchel Charges y Warcrosses no la llevan.
 * - Granadas con BLAST: solo contra un modelo enemigo, no contra un punto.
 * - Masters of the Grenade: +4", pero -1 DICE si el objetivo está a más de 8".
 * - Incendiary Grenades a 10 👑 (NA, TP, IS, HL y The Court).
 * - Combat Engineer: +1 DICE a distancia, +0 DICE cuerpo a cuerpo.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, KEYWORD_GLOSSARY, VARIANT_FACTION_RULES, FACTION_RULES_LIBRARY };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const grenades = Object.entries(X.DATA.factions).flatMap(([fid, f]) => (f.armoury && f.armoury.grenades || []).map(g => Object.assign({ fid }, g)));

console.log('\nGroup 1: FUMBLE');
const FUMBLE = /^(Frag Grenades|Gas Grenades|Incendiary Grenades|Molotov Cocktail|Parasite Grenades|Demonic Aura Grenade|Holy Grenade)$/;
const withF = grenades.filter(g => FUMBLE.test(g.name));
ok(withF.length >= 12, withF.length + ' granadas de la lista en las armerías');
const missing = withF.filter(g => !(g.weaponKeywords || []).includes('FUMBLE'));
ok(missing.length === 0, 'todas llevan FUMBLE (' + missing.map(g => g.id).join(', ') + ')');
const wrong = grenades.filter(g => /Satchel|Warcross/.test(g.name) && (g.weaponKeywords || []).includes('FUMBLE'));
ok(wrong.length === 0 && grenades.some(g => /Satchel/.test(g.name)) && grenades.some(g => /Warcross/.test(g.name)), 'Satchel Charge y Warcross sin FUMBLE');
const fk = X.KEYWORD_GLOSSARY.find(e => e.key === 'FUMBLE');
ok(fk && fk.type === 'Efecto' && /2 o menos/.test(fk.text) && /abril 2026/.test(fk.src), 'FUMBLE en el glosario (Success Roll de 2 o menos)');

console.log('\nGroup 2: objetivo de las granadas con BLAST');
const blast = X.KEYWORD_GLOSSARY.find(e => /^BLAST/.test(e.key));
ok(/granadas/i.test(blast.note || '') && /modelo enemigo/.test(blast.note || ''), 'BLAST: las granadas solo apuntan a un modelo enemigo');

console.log('\nGroup 3: Masters of the Grenade');
const pr = (X.VARIANT_FACTION_RULES['new-antioch:prussia'] || []).find(r => r.name === 'Masters of the Grenade');
ok(pr && /4"/.test(pr.desc) && /8"/.test(pr.desc) && /-1 DICE/.test(pr.desc), 'regla de banda: +4" y -1 DICE a más de 8"');
ok(/8"/.test(X.FACTION_RULES_LIBRARY['Masters of the Grenade (Stosstruppen)'].summary), 'resumen de la biblioteca de reglas con el -1 DICE');

console.log('\nGroup 4: Incendiary Grenades a 10 👑');
['new-antioch', 'trench-pilgrims', 'iron-sultanate', 'heretic-legions', 'court-serpent'].forEach(fid => {
  const inc = grenades.find(g => g.fid === fid && g.name === 'Incendiary Grenades');
  ok(inc && inc.cost === 10, fid + ': Incendiary Grenades 10 👑');
});

console.log('\nGroup 5: Combat Engineer');
const ce = X.DATA.factions['new-antioch'].units.find(u => u.id === 'combat-engineers');
ok(ce.stats.ranged === '+1 DICE' && ce.stats.melee === '+0 DICE' && ce.stats.armour === '-2', 'perfil 6" · +1 DICE · +0 DICE · -2');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
