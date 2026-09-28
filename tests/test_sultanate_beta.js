/* Iron Sultanate según la revisión de reglas de abril 2026 (beta), que es la
 * que se juega en mesa (decisión de Marcos, 2026-09-27). Fuente:
 * trenchcrusade.com/trench-wire/rules/iron-sultanate-rules-update/ (tarjetas
 * Sultanate-1..4). Decisiones: los Dervishes (Fida'i) mantienen Counter-Charge;
 * los Janissary Officers (Iron Wall) heredan Mehterân; el Silahdar hereda el
 * nuevo Yüzbaşı (75 👑, Veteran +5 con Mehterân).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, ABILITY_LIBRARY, EQUIPMENT_IMPLICIT_ABILITIES, getUnit, effectiveKeywords, effectiveAbilities };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const IS = X.DATA.factions['iron-sultanate'];
const all = Object.values(IS.armoury).flat();
const item = (id) => all.find(i => i.id === id) || {};
const kw = (id) => (item(id).weaponKeywords || []).join(', ');
const unit = (id) => IS.units.find(u => u.id === id) || {};
const upg = (u, id) => (unit(u).upgrades || []).find(x => x.id === id) || {};

console.log('\nGroup 1: armería modificada');
ok(item('alaybozan-is').cost === 10 && kw('alaybozan-is') === 'SHOTGUN, SHRAPNEL', 'Alaybozan 10 👑 · SHOTGUN, SHRAPNEL');
ok(item('halberd-gun-is').cost === 30 && /Shield Combo/.test(item('halberd-gun-is').restriction) && /Limit: 2/.test(item('halberd-gun-is').restriction), 'Halberd-Gun 30 👑 · ELITE only, Shield Combo, Limit: 2');
ok(kw('halberd-gun-is') === '+1 INJURY DICE, ASSAULT, BLOCK, CUMBERSOME, HEAVY', 'Halberd-Gun +1 INJURY DICE, ASSAULT, BLOCK, CUMBERSOME, HEAVY');
ok(kw('flame-cannon-is') === 'ASSAULT, FIRE, HEAVY, IGNORE ARMOUR' && /Greek Fire/.test(item('flame-cannon-is').note), 'Flame Cannon con ASSAULT y Greek Fire');
ok(kw('murad-bombard-is') === '+1 DICE, BLAST 3", HEAVY, SCATTER' && /Echoing Blast/.test(item('murad-bombard-is').note), 'M.U.R.A.D. Bombard +1 DICE y Echoing Blast');

console.log('\nGroup 2: armería nueva');
const gas = item('gas-is');
ok(gas.name === 'Gas Grenades' && gas.cost === 10 && /Limit: 4/.test(gas.restriction) && (IS.armoury.grenades || []).includes(gas), 'Gas Grenades 10 👑 · Limit: 4');
ok(kw('gas-is') === '-1 INJURY DICE, ASSAULT, BLAST 3", FUMBLE, GAS, IGNORE ARMOUR, IGNORE COVER, IGNORE LONG RANGE', 'Gas Grenades con el perfil estándar (FUMBLE de la beta de granadas)');
ok(item('al-inbiq-is').name === 'Al-inbīq Kit' && item('al-inbiq-is').cost === 15 && /Jabirean Alchemist only/.test(item('al-inbiq-is').restriction), 'Al-inbīq Kit 15 👑 · Jabirean Alchemist only');
ok(item('alch-fire-is').name === 'Alchemical Fire' && item('alch-fire-is').cost === 10 && /ELITE only/.test(item('alch-fire-is').restriction) && /Limit: 3/.test(item('alch-fire-is').restriction), 'Alchemical Fire 10 👑 · ELITE only, Limit: 3');
ok(item('corrosive-ammo-is').name === 'Corrosive Ammunition' && item('corrosive-ammo-is').cost === 10 && /Limit: 5/.test(item('corrosive-ammo-is').restriction) && kw('corrosive-ammo-is') === 'AMMUNITION (ARMOUR PIERCING)', 'Corrosive Ammunition 10 👑 · Limit: 5 · AMMUNITION (ARMOUR PIERCING)');
const kas = item('kasik-is');
ok(kas.name === 'Regimental Kaşık' && kas.cost === 4 && kas.currency === '☼' && /Limit: 1/.test(kas.restriction) && kw('kasik-is') === 'LEADER', 'Regimental Kaşık 4 ☼ · LEADER · Limit: 1');
const EQ = X.EQUIPMENT_IMPLICIT_ABILITIES;
const eqAb = (n) => (EQ[n] || []).map(a => a.name);
ok(eqAb('Al-inbīq Kit').includes("'Ilm al-Mīzān ACTION"), "Al-inbīq Kit → 'Ilm al-Mīzān ACTION");
ok(eqAb('Alchemical Fire').includes('Unfettered Flame'), 'Alchemical Fire → Unfettered Flame');
ok(eqAb('Corrosive Ammunition').includes('Volatile Concoction'), 'Corrosive Ammunition → Volatile Concoction');
ok(eqAb('Regimental Kaşık').includes('Brotherhood of the Spoon'), 'Regimental Kaşık → Brotherhood of the Spoon');

console.log('\nGroup 3: unidades');
const wb = { factionId: 'iron-sultanate', models: [] };
const yz = unit('yuzbasi');
ok(yz.cost === 75 && yz.keywords.includes('STRONG'), 'Yüzbaşı 75 👑 con STRONG de serie');
ok(upg('yuzbasi', 'veteran').cost === 5 && (upg('yuzbasi', 'veteran').addsAbilities || []).join() === 'Mehterân' && !(upg('yuzbasi', 'veteran').addsKeywords || []).length, 'Janissary Veteran +5 👑 da Mehterân (ya no STRONG ni Counter-Charge)');
ok(unit('janissaries').abilities.join() === 'Mehterân', 'Janissaries: Mehterân en vez de Counter-Charge');
ok(upg('lions', 'lion-claws').cost === 5 && /CLEAVE 2/.test(upg('lions', 'lion-claws').note), 'Lions of Jabir: Ferocious Claws +5 👑 (CLEAVE 2)');
const bb = unit('brazen-bull');
ok(bb.cost === 115 && bb.keywords.includes('NEGATE SHRAPNEL') && bb.abilities.includes('Living Battering Ram ACTION') && bb.abilities.includes('Trample ACTION'), 'Brazen Bull 115 👑, NEGATE SHRAPNEL y Living Battering Ram ACTION');
['Mehterân', 'Living Battering Ram ACTION', 'Ferocious Claws'].forEach(n => ok(!!(X.ABILITY_LIBRARY[n] && X.ABILITY_LIBRARY[n].summary), 'texto de ' + n));

console.log('\nGroup 4: variantes');
const sil = unit('silahdar-iw');
ok(sil.cost === 75 && upg('silahdar-iw', 'veteran').cost === 5 && (upg('silahdar-iw', 'veteran').addsAbilities || []).join() === 'Mehterân', 'Silahdar 75 👑, Veteran +5 con Mehterân');
ok(unit('janofficer-iw').abilities.join() === 'Mehterân', 'Janissary Officer (Iron Wall): Mehterân');
ok(unit('faris-how').abilities.join() === 'Mehterân', 'Fāris (House of Wisdom, entrada de Janissary con ELITE): Mehterân');
ok(unit('dervish-fid').abilities.includes('Counter-Charge') && !unit('dervish-fid').abilities.includes('Mehterân'), 'Dervishes (Fida\'i): mantienen Counter-Charge');
const vy = { uid: 'y', unitId: 'yuzbasi', upgrades: ['veteran'], battlekit: [] };
ok(X.effectiveAbilities(vy, yz, wb).includes('Mehterân') && X.effectiveKeywords(vy, yz, wb).includes('STRONG'), 'motor: Yüzbaşı Veteran con Mehterân y STRONG');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
