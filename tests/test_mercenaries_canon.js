/* Mercenarios y Battlekit del Anchorite frente a Warbands of Trench
 * Crusade 1.0.2 (Mercenaries, War Pilgrimage of Saint Methodius).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, W: WEAPON_KEYWORD_LIBRARY };');
const X = dom.window.__X;
const merc = (id) => X.DATA.mercenaries.find(m => m.id === id);
const item = (id) => Object.values(X.DATA.factions).flatMap(f => [].concat(...Object.values(f.armoury || {}).filter(Array.isArray))).find(i => i.id === id);

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

console.log('\nGroup 1: perfiles de mercenarios');
const mf = merc('mamluk-faris');
ok(mf.stats.movement === '6"/Infantry' && mf.stats.ranged === '+1 DICE' && mf.stats.melee === '+1 DICE', 'Mamluk Faris: 6"/Infantry +1/+1 (no 10"/Cavalry)');
ok(mf.stats.armour === '-2 (-3)' && mf.stats.base === '32mm', 'Mamluk Faris: Armour -2 (-3), 32mm');
ok(!mf.keywords.includes('CAVALRY') && mf.keywords.includes('IGNORE OFF-HAND WEAPON'), 'Mamluk Faris: IGNORE OFF-HAND WEAPON, sin CAVALRY');
const ob = merc('observer');
ok(ob.stats.melee === '+2 DICE' && ob.stats.armour === '-1' && ob.stats.base === '32mm', 'Observer: Melee +2, Armour -1, 32mm');
ok(!merc('scripture-guardian').keywords.includes('TOUGH'), 'Scripture Guardian: solo GOLEM');
ok(merc('sin-eater').keywords.includes('TOUGH'), 'Sin Eater: DEMONIC, FEAR, STRONG, TOUGH');
ok(merc('st-cosmas').stats.armour === '-1', 'Sister of Saint Cosmas: Armour -1');

console.log('\nGroup 2: Battlekit del Anchorite');
ok(item('autocannon-anchor').type === '1-Handed', 'Autocannon cuenta como 1-Handed en el Anchorite (como el resto)');
['grand-anchor-bk', 'hallow-anchor-bk', 'sacred-geo-anchor'].forEach(id => {
  ok(/Limit: 1/.test(item(id).restriction) && !/Unique/.test(item(id).restriction), id + ': Limit: 1 (no Unique)');
});
ok(!/RELOAD obligatorio/.test(X.W['Full Auto'].summary) && /Bursts/.test(X.W['Full Auto'].summary), 'Full Auto: eliges perfil en cada Shoot ACTION');
ok(/Grand Anchorite/.test(X.W['Impossible to Stop'].summary), 'Impossible to Stop: Grand Anchorite Shrine');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
