/* Stosstruppen of the Free State of Prussia (Warbands 1.0.2): creación de banda.
 * Athleticism (Rapid Assault +5), Feldkaplane (Holy Smoke), Forward Positions
 * (máx. 2 INFILTRATOR), Lightly-armoured, Light Melee (sin Assault Drill),
 * Masters of the Grenade (+4"), Specialised Equipment y Troop Selection.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  html += '\n<style>\n' + cssContent + '\n</style>\n';
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'public', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\n');
  html += '\n<script>\n' + jsContentAll + '\n</script>\n';
const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\n');
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace('</body>', '<script>' + js + '</script></body>').replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
dom.window.alert = () => {};
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, checkUpgradeLegality, lookupRuleText, armouryItemsForWarband };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const PR = (models = []) => ({ factionId: NA, variantId: 'prussia', models });
const BASE = (models = []) => ({ factionId: NA, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(NA, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(NA, model.unitId), wb).state;
}
const upState = (wb, model, upId) => {
  const unit = X.getUnit(NA, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};
const troopers = n => Array.from({ length: n }, () => M('shock-troopers'));

console.log('\nGroup 1: Troop Selection');
ok(X.canAddUnit(PR(troopers(7)), X.getUnitWithVariant(PR(), 'shock-troopers')), '8.º Shock Trooper permitido');
ok(!X.canAddUnit(PR(troopers(8)), X.getUnitWithVariant(PR(), 'shock-troopers')), 'no un 9.º');
ok(X.checkUpgradeLegality(PR([M('lieutenant'), M('shock-troopers')])).some(w => /Shock Troopers/.test(w)), 'aviso si hay menos de 2 Shock Troopers');
ok(!X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), PR()).some(u => u.id === 'trench-mole'), 'sin Trench Moles (mejora de Yeomen)');
ok(X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), BASE()).some(u => u.id === 'trench-mole'), 'sin variante: Trench Mole disponible');
ok(!X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), { factionId: NA, variantId: 'papal-states', models: [] }).some(u => u.id === 'trench-mole'), 'Papal States: sin Trench Moles');
ok(!X.canAddUnit(PR([M('sniper-priests')]), X.getUnitWithVariant(PR(), 'sniper-priests')), 'máximo 1 Sniper Priest');
ok(!X.canAddUnit(PR([M('mech-heavy-inf')]), X.getUnitWithVariant(PR(), 'mech-heavy-inf')), 'máximo 1 MHI');

console.log('\nGroup 2: Specialised Equipment');
const smg3 = [1, 2, 3].map(() => M('shock-troopers', ['smg-na']));
ok(state(PR, M('shock-troopers'), 'smg-na', smg3) === 'available', 'SMG: Limit 4 (4.º disponible)');
ok(state(PR, M('shock-troopers'), 'auto-pistol-na') === 'available', 'Automatic Pistol sin ELITE only');
ok(state(BASE, M('shock-troopers'), 'auto-pistol-na') === 'hidden', 'sin variante: Automatic Pistol ELITE only');
ok(state(PR, M('shock-troopers'), 'machine-gun-na', [M('shock-troopers', ['machine-gun-na'])]) === 'disabled', 'Machine Gun: Limit 1');
ok(state(PR, M('shock-troopers'), 'grenade-launcher-na') === 'hidden', 'sin Grenade Launcher');
ok(state(PR, M('lieutenant'), 'martyr-pills-na') === 'hidden', 'sin Martyrdom Pills');

console.log('\nGroup 3: armería propia y granadas');
const ts = X.findBattlekitItem(NA, 'tank-splitter-prussia');
ok(ts && ts.cost === 15 && /Limit: 2/.test(ts.restriction) && ts.type === '2-Handed' && ['+1 INJURY DICE', 'CRITICAL', 'CUMBERSOME'].every(k => ts.weaponKeywords.includes(k)) && /Melt Armour/.test(ts.note), 'Tank-Splitter Sword: 15, Limit 2, 2H, +1 INJURY DICE CRITICAL CUMBERSOME, Melt Armour');
ok(state(PR, M('shock-troopers'), 'tank-splitter-prussia') === 'available' && state(BASE, M('shock-troopers'), 'tank-splitter-prussia') === 'hidden', 'Tank-Splitter solo en Prussia');
ok(state(PR, M('trench-cleric'), 'holy-smoke-prussia') === 'available', 'Holy Smoke: Trench Cleric');
ok(state(PR, M('shock-troopers'), 'holy-smoke-prussia') === 'hidden', 'Holy Smoke: solo Trench Clerics');
const frag = X.armouryItemsForWarband(PR(), 'grenades');
const fragBase = X.armouryItemsForWarband(BASE(), 'grenades');
ok(frag.length && frag.every((g, i) => parseInt(g.range) === parseInt(fragBase[i].range) + 4), 'Masters of the Grenade: +4" a todas las granadas');

console.log('\nGroup 4: mejoras y habilidades');
const st = X.getUnit(NA, 'shock-troopers');
ok((X.allAvailableUpgrades(st, PR()).find(u => u.id === 'rapid-assault') || {}).cost === 5, 'Rapid Assault +5 (Shock Troopers)');
ok((X.allAvailableUpgrades(X.getUnit(NA, 'lieutenant'), PR()).find(u => u.id === 'rapid-assault') || {}).cost === 5, 'Rapid Assault +5 (Lieutenant)');
const inf = [M('shock-troopers', [], ['stoss-infiltrator']), M('shock-troopers', [], ['stoss-infiltrator'])];
const third = M('shock-troopers');
ok(upState(PR(inf.concat(third)), third, 'stoss-infiltrator') === 'disabled', 'Forward Positions: máximo 2 INFILTRATOR');
ok(/Dash/.test(X.lookupRuleText('Rapid Assault')), 'Rapid Assault con texto');
ok(!X.effectiveAbilities(M('shock-troopers'), st, PR()).includes('Assault Drill'), 'Light Melee: sin Assault Drill');
ok(X.effectiveAbilities(M('shock-troopers'), st, BASE()).includes('Assault Drill'), 'sin variante: Assault Drill');
ok(state(PR, M('trench-cleric'), 'reinforced-armour-na') === 'hidden', 'Lightly-armoured: Trench Cleric sin Reinforced Armour');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

