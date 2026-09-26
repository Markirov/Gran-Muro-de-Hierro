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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { C: CAMPAIGN_TABLES, S: SCENARIOS_CATALOG, P: PATRON_CATALOG };');
const C = dom.window.__X.C;
const S = dom.window.__X.S;
const P = dom.window.__X.P;

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

console.log('\nGroup 4: escenarios (Rulebook 1.0.2)');
ok(S['hold-the-line'].name === "I — Claim No Man's Land", 'I se llama Claim No Man\'s Land');
ok(S['mines'].name === 'IV — Trench Warfare', 'IV se llama Trench Warfare');
ok(!/Capture and Hold/.test(S['capture-hold'].name), '"X — Capture and Hold" no existe');
ok(S['hunt-heroes'].numTurns === 5 && S['fields-of-glory'].numTurns === 4, 'II dura 5 turnos; IX dura 4');
const allDeeds = Object.values(S).flatMap(sc => sc.deeds.map(d => d.name));
['Drawing Blood', 'Conductor (Defender)', 'Survive the Pit', 'Demolition (Attacker)', 'Hold the Bunker (Defender)', 'Survive the Gas'].forEach(n => {
  ok(!allDeeds.includes(n), 'gesta inventada fuera: ' + n);
});
ok(S['dragon-hunt'].deeds.some(d => d.name === 'Fire with Fire') && S['from-below'].deeds.some(d => d.name === 'For Science'), 'VI y VIII con sus gestas reales');
ok(S['armoured-train'].deeds.some(d => d.name === 'Meat-Grinder') && S['fields-of-glory'].deeds.some(d => d.name === 'Trench Raider'), 'V y IX con sus gestas reales');
ok(/Top Priority/.test(S['high-ground'].vpHints), 'XI: VPs de Top Priority');

console.log('\nGroup 5: Patrones');
const skill = (pid, n) => (P[pid].skills.find(x => x.name === n) || {}).summary || '';
ok(/menor de 50mm|no.*50mm o más/.test(skill('sublime-gate', "Sultan's Favour")), "Sultan's Favour: modelos de base menor de 50mm");
ok(/Charge/.test(skill('sublime-gate', 'Rightly Guided')), 'Rightly Guided: excluye Charge, Shoot y Fight');
ok(/BLESSED D3/.test(skill('warrior-saint', 'Blessings of the Warrior Saint')), 'Blessings of the Warrior Saint: keyword BLESSED D3');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
