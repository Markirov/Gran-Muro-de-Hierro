/* Expeditionary Forces of Abyssinia (Warbands 1.0.2): creación de banda.
 * Abyssinian Healers, Chieftain Panoply, Faith of Ethiopia, Holy Warriors,
 * Vanguard Forces (Flanking), Warrior Nobles (Chewa), Weapons of Mobile
 * Warfare y su armería (Shotel, Holy Water of Lalibela, Anfarro, Tabot).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, unitsAvailableForWarband, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const NA = 'new-antioch';
const AB = (models = []) => ({ factionId: NA, variantId: 'abyssinia', models });
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

console.log('\nGroup 1: unidades');
ok(X.canAddUnit(AB([M('combat-medic')]), X.getUnitWithVariant(AB(), 'combat-medic')), 'Abyssinian Healers: 2.º Combat Medic');
const hw = X.getUnit(NA, 'holy-warrior-abys');
ok(hw && hw.variantOnly === 'abyssinia' && hw.limit === '0-2' && hw.cost === 60 && hw.tier === 'elite', 'Holy Warrior: 0-2, entrada de Trench Cleric (60 👑)');
ok(hw && ['Blessed Psalm ACTION', 'Arise and be Healed! ACTION'].every(a => hw.abilities.includes(a)), 'Holy Warrior: Blessed Psalm y Arise and be Healed!');
ok(/BLESS/.test(X.lookupRuleText('Blessed Psalm ACTION')), 'Blessed Psalm con texto');
ok(X.unitsAvailableForWarband(AB()).some(u => u.id === 'holy-warrior-abys') && !X.unitsAvailableForWarband(BASE()).some(u => u.id === 'holy-warrior-abys'), 'Holy Warrior solo en Abyssinia');
ok(!X.canAddUnit(AB(), X.getUnit(NA, 'sniper-priests')), 'sin Sniper Priests');
ok(!X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), AB()).some(u => u.id === 'trench-mole'), 'sin Trench Moles');

console.log('\nGroup 2: Chieftain Panoply');
const mhi = M('mech-heavy-inf'); mhi.costVariant = 'alt';
ok(X.modelCost(mhi, NA, AB([mhi])).ducados === X.getUnit(NA, 'mech-heavy-inf').cost, 'MHI: sin Machine Armour (coste base aunque tenga la variante alt)');
ok(X.getUnitWithVariant(AB(), 'mech-heavy-inf').costAlt == null, 'MHI: sin opción de coste con Machine Armour');

console.log('\nGroup 3: mejoras');
const four = [1, 2, 3, 4].map(() => M('yeomen', [], ['flanking']));
const y5 = M('yeomen');
ok(upState(AB([y5]), y5, 'flanking') === 'available', 'Vanguard Forces: Flanking +5 en Yeomen');
ok(upState(AB(four.concat(y5)), y5, 'flanking') === 'disabled', 'Flanking: máximo 4');
ok(/deploy|despleg/i.test(X.lookupRuleText('Flanking')), 'Flanking con texto');
['shock-troopers', 'lieutenant', 'trench-cleric', 'holy-warrior-abys'].forEach(u => {
  ok((X.allAvailableUpgrades(X.getUnit(NA, u), AB()).find(x => x.id === 'chewa') || {}).cost === 5, u + ': Chewa +5');
});
ok(!X.allAvailableUpgrades(X.getUnit(NA, 'yeomen'), AB()).some(x => x.id === 'chewa'), 'Yeomen: sin Chewa');

console.log('\nGroup 4: armería');
ok(state(AB, M('combat-medic'), 'misericordia-na', [M('combat-medic', ['misericordia-na'])]) === 'available', 'Misericordia: Limit 2');
const heavy3 = [1, 2, 3].map(() => M('mech-heavy-inf', ['machine-gun-na']));
const mg = X.DATA.factions[NA].armoury.ranged.filter(i => (i.weaponKeywords || []).includes('HEAVY'));
ok(mg.length > 0 && state(AB, M('shock-troopers'), 'heavy-flamethrower-na', heavy3) === 'disabled', 'máximo 3 armas a distancia HEAVY');
ok(state(AB, M('combat-engineers'), 'satchel-na', heavy3) !== 'disabled', 'Satchel Charges no cuentan');
const chewaST = M('shock-troopers', [], ['chewa']);
ok(state(AB, chewaST, 'shotel-abys') === 'available', 'Shotel: modelo con Chewa');
ok(state(AB, M('shock-troopers'), 'shotel-abys') === 'hidden', 'Shotel: sin Chewa no');
ok(state(AB, M('lieutenant', [], ['chewa']), 'anfarro-abys') === 'available' && state(AB, M('lieutenant'), 'anfarro-abys') === 'hidden', 'Anfarro: requiere Chewa');
const an = X.findBattlekitItem(NA, 'anfarro-abys');
ok(an && an.cost === 10 && /Headgear/.test(an.restriction) && /Limit: 6/.test(an.restriction) && an.weaponKeywords.includes('NEGATE FEAR'), 'Anfarro: 10, Headgear, Limit 6, NEGATE FEAR');
const hwt = X.findBattlekitItem(NA, 'holy-water-abys');
ok(hwt && hwt.cost === 3 && /Consumable/.test(hwt.restriction) && /Limit: 5/.test(hwt.restriction), 'Holy Water of Lalibela: 3, Consumable, Limit 5');
ok(state(AB, M('holy-warrior-abys'), 'tabot-abys') === 'available' && state(AB, M('trench-cleric'), 'tabot-abys') === 'hidden', 'Tabot: solo Holy Warrior');
ok(X.findBattlekitItem(NA, 'tabot-abys').currency === '☼' && X.findBattlekitItem(NA, 'tabot-abys').cost === 4, 'Tabot: 4 ☼');
ok(state(BASE, chewaST, 'shotel-abys') === 'hidden', 'sin variante: sin Shotel');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
