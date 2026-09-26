/* Tablas de campaña (CAMPAIGN_TABLES) frente al Digital Rulebook 1.0.2:
 * Trauma Table (Leg Wound), Glorious Deeds de los escenarios I-XI y
 * Exploration Location Tables.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { C: CAMPAIGN_TABLES };');
const C = dom.window.__X.C;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: Trauma Table');
const leg = C.statDownOptions.find(s => s.sourceTrauma === 31);
ok(leg && leg.name === '-2" Movement', 'Leg Wound (31): -2" Movement (no -1")');

console.log('\nGroup 2: Glorious Deeds de los escenarios');
const deeds = C.canonicalGloriousDeeds.map(d => d.name);
['Massacre', 'Assassinate', 'First Blood', 'Last One Standing', 'Clear the Trench', 'Behind Enemy Lines'].forEach(n => {
  ok(!deeds.includes(n), n + ' no existe en el Rulebook 1.0.2');
});
['Bloodletting', 'Lord of War', 'Sniper', 'Death From Above', 'Relic Hunter', 'Into the Trenches!', 'Dragon Slayer', 'Reaper', 'Iron Lungs', 'Down with You'].forEach(n => {
  ok(deeds.includes(n), n + ' incluida');
});
const fwf = C.canonicalGloriousDeeds.find(d => d.name === 'Fire with Fire');
ok(fwf && /Dragón/.test(fwf.summary) && fwf.category === 'scenario', 'Fire with Fire: gesta de Dragon Hunt');
ok(C.canonicalGloriousDeeds.length >= 55, 'al menos 55 gestas (' + C.canonicalGloriousDeeds.length + ')');

console.log('\nGroup 3: Exploration Location Tables');
const E = C.explorationTables;
ok(E.common[5].options.some(o => o.effect && o.effect.kind === 'choose-glory-items' && o.effect.maxGlory === 5), 'Heavy Weapons Cache: opción Specialise (Glory Item hasta 5)');
ok(E.common[8].options.some(o => o.effect && o.effect.kind === 'choose-glory-items' && o.effect.maxGlory === 7), 'Ruined House: opción Relic (Glory Item hasta 7)');
[[20, "Lock of Samson's Hair"], [23, "Patron's Visit"], [26, 'Sample of Holy DNA'], [30, 'Golgotha Tektites'], [36, 'Fruit from the Tree of Good and Evil Knowledge']].forEach(([r, n]) => {
  ok(E.legendary[r] && E.legendary[r].name === n, 'Legendary ' + r + ': ' + n);
});
const scream = E.legendary[18].options.find(o => o.id === 'screaming-skull');
ok(!/consultar/.test(scream.effect.note) && /\+2 DICE/.test(scream.effect.note), 'Screaming Skull: +2 DICE a Morale y 1 ☼ (sin "consultar reglas")');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
