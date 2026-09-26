/* Reglas especiales de facción y de variantes frente a Warbands of Trench
 * Crusade 1.0.2 (y los PDF de The Red Brigade / The Great Hunger).
 * Trench Pilgrims, Iron Sultanate y Heretic Legions no tienen reglas de
 * facción; los resúmenes de variantes no llevan efectos inventados.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { F: FACTION_RULES_LIBRARY, V: VARIANT_FACTION_RULES, DATA };');
const X = dom.window.__X;
const F = (k) => (X.F[k] && X.F[k].summary) || '';
const V = (key) => (X.V[key] || []).map(r => r.name + ': ' + r.desc).join(' | ');
const facs = () => Object.values(X.DATA.factions);
const faction = (id) => facs().find(f => f.id === id) || X.DATA.factions[id];
const variant = (id) => facs().flatMap(f => f.variants || []).find(v => v.id === id);

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: reglas base de facción');
const base = js.match(/const baseRulesByFaction = \{([\s\S]*?)\};/)[1];
ok(!/trench-pilgrims|iron-sultanate|heretic-legions/.test(base), 'baseRulesByFaction: TP, IS y HL sin regla de facción');
ok(/'new-antioch'/.test(base) && /'black-grail'/.test(base) && /'court-serpent'/.test(base), 'baseRulesByFaction: NA, Black Grail y Court conservan la suya');
['trench-pilgrims', 'iron-sultanate', 'heretic-legions'].forEach(id => {
  ok(faction(id).specialRules.length === 0, id + ': specialRules vacío');
});
ok(/Concentrated Attack/.test(F('New Antioch Fireteams')) && /3 BLOOD MARKERS/.test(F('New Antioch Fireteams')), 'Fireteams: Concentrated Attack gasta 3 BLOOD MARKERS');
ok(/Morale/.test(F('Infection Markers')) && /-1 DICE/.test(F('Infection Markers')), 'Black Grail: INFECTION MARKERS + Morale -1 DICE');
ok(/Seven Deadly Sins/.test(F('Goetic Powers (Faction Rule)')) && /BLOOD MARKERS/.test(F('Goetic Powers (Faction Rule)')), 'Court: Seven Deadly Sins + Goetic Spells pagados con BLOOD MARKERS');
ok(/Fiery Exodus/.test(F('Hellbound Soul Contract')) && /NEGATE FIRE/.test(F('Hellbound Soul Contract')), 'Hellbound Soul Contract: Fiery Exodus');
ok(/Procession/.test(F('Wrath of God')) && /15/.test(F('Wrath of God')), 'Wrath of God: regla de la Procession, 15 ducados');
ok(/0-3 Lions of Jabir/.test(F('Pride of Jabir')), 'Pride of Jabir: 0-3 Lions (House of Wisdom)');

console.log('\nGroup 2: VARIANT_FACTION_RULES sin efectos inventados');
ok(!/Hold the Line/.test(V('new-antioch:alba')) && /NEGATE FEAR/.test(V('new-antioch:alba')) && /Brave/.test(V('new-antioch:alba')), 'Alba: Brave y Bagpipes = NEGATE FEAR (sin Hold the Line)');
ok(/\+5/.test(V('new-antioch:prussia')), 'Prussia: Rapid Assault solo comprado (+5)');
ok(!/\+1 DICE Ranged a todo/.test(V('iron-sultanate:house-wisdom')), 'House of Wisdom: sin +1 DICE Ranged inventado');
ok(!/INJURY MOD a Plague/.test(V('black-grail:great-hegemon')) && /Command Bereaved/.test(V('black-grail:great-hegemon')), 'Dirge: Command Bereaved (sin +1 INJURY MOD)');
ok(/TOUGH/.test(V('trench-pilgrims:tenth-plague')), 'Tenth Plague: Castigators con TOUGH');
ok(/Semi-corporeal/.test(V('heretic-legions:trench-ghosts')), 'Trench Ghosts: Semi-corporeal');
ok(!/Antipope/.test(V('black-grail:great-hunger')) && /Matagot Hag/.test(V('black-grail:great-hunger')), 'Great Hunger: Eternal Appetence con Matagot Hag');
ok(/200/.test(V('new-antioch:red-brigade')) && /máx\. 2/.test(V('new-antioch:red-brigade')), 'Red Brigade: Wear and Tear con máximo 2 por modelo');

console.log('\nGroup 3: resúmenes de variantes (FACTION_RULES_LIBRARY y DATA)');
ok(/Castigators tienen TOUGH/.test(F('Cavalcade of the Tenth Plague')), 'Tenth Plague: Blood of the Lamb');
ok(/Lochaber Axe/.test(F('Kingdom of Alba Assault')) && /STRONG/.test(F('Kingdom of Alba Assault')), 'Alba: Highland Strength y Lochaber Axe');
ok(/\+4"/.test(F('Rapid Assault')) && /2-8 Shock Troopers/.test(F('Rapid Assault')), 'Stosstruppen: granadas +4" y 2-8 Shock Troopers');
ok(/Takwin Homunculus/.test(F('House of Wisdom')), 'House of Wisdom: Takwin Homunculus');
ok(/Master Assassin/.test(F("Fida'i of Alamut")) && /95/.test(F("Fida'i of Alamut")), "Fida'i: Master Assassin 95");
ok(/Executor/.test(F('Dirge of the Great Hegemon')) && /80/.test(F('Dirge of the Great Hegemon')), 'Dirge: Executor 80');
ok(/Eternal Appetence/.test(F('The Great Hunger')) && !/Consultar/.test(F('The Great Hunger')), 'Great Hunger: reglas del PDF, sin "consultar"');
ok(/Wear and Tear/.test(F('The Red Brigade')), 'Red Brigade: reglas del PDF');
ok(!/Antipope|consulta el PDF/.test(variant('great-hunger').summary), 'Great Hunger (DATA): sin Antipope ni "consulta el PDF"');
const vague = Object.keys(X.F).filter(k => /consultar|consulta el pdf|no incluidas/i.test(F(k)));
ok(vague.length === 0, 'ninguna regla de facción remite a consultar fuentes (' + vague.join(', ') + ')');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
