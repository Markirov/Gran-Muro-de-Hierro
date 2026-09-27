/* Variantes de Trench Pilgrims (Warbands 1.0.2): Procession of the Sacred
 * Affliction y War Pilgrimage of Saint Methodius. Incluye las reglas base que
 * les afectan (Zealot Strength máx. 1, Martyrdom Device de los Ecclesiastic
 * Prisoners, Anchorite sin Battlekit fuera de Saint Methodius).
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveStats, checkUpgradeLegality };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const TP = 'trench-pilgrims';
const W = v => (models = []) => ({ factionId: TP, variantId: v, models });
const PR = W('sacred-affliction'), ME = W('st-methodius'), BASE = W(null);
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(TP, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(TP, model.unitId), wb).state;
}
const upState = (wb, model, upId) => {
  const unit = X.getUnit(TP, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};

console.log('\nGroup 1: reglas base');
const zp = M('pilgrim', [], ['zealot-strength-pilgrim']);
const mp = M('martyr-penitent');
ok(upState(BASE([zp, mp]), mp, 'zealot-strength-martyr') === 'disabled', 'Zealot Strength: 1 entre Trench Pilgrims y Martyr Penitents');
ok(X.effectiveStats(zp, X.getUnit(TP, 'pilgrim'), BASE([zp])).base === '32mm', 'Zealot Strength: base 32mm');
const pris = X.getUnit(TP, 'eccl-prisoners');
const md = X.allAvailableUpgrades(pris, BASE()).find(u => u.id === 'martyrdom-device');
ok(md && md.cost === 35, 'Ecclesiastic Prisoners: Martyrdom Device 35 👑');
const four = [1, 2, 3, 4].map(() => M('eccl-prisoners', [], ['martyrdom-device']));
const p5 = M('eccl-prisoners');
ok(upState(BASE(four.concat(p5)), p5, 'martyrdom-device') === 'disabled', 'Martyrdom Device: máximo 4');
ok(state(BASE, M('anchorite-shrine'), 'autocannon-anchor') === 'hidden', 'Anchorite sin variante: sin armas de Anchorite (solo Mace y Catherine Wheel)');

console.log('\nGroup 2: Procession of the Sacred Affliction');
ok(state(PR, M('pilgrim'), 'capirote-tp') === 'hidden', 'Face thy Fears: sin Iron Capirote');
ok(!X.getUnitWithVariant(PR(), 'eccl-prisoners').permanentEquipment.includes('Iron Capirote'), 'Ecclesiastic Prisoners sin Iron Capirote');
ok(state(PR, M('pilgrim'), 'antitank-hammer-tp') === 'available', 'Hammer and the Anvil: Anti-Tank Hammer sin ELITE only');
ok(state(PR, M('pilgrim'), 'mg-tp') === 'hidden', 'Melee-focused: sin Machine Gun');
ok(state(PR, M('pilgrim'), 'punt-gun-tp', [M('pilgrim', ['punt-gun-tp'])]) === 'disabled', 'Punt Gun: Limit 1');
const hi = X.findBattlekitItem(TP, 'holy-icon-tp', PR());
ok(hi.cost === 20 && hi.currency === '👑' && state(PR, M('pilgrim'), 'holy-icon-tp') === 'available', 'Reliquary Armoury: Holy Icon Shield 20 👑 sin ELITE only');
const ha = X.findBattlekitItem(TP, 'holy-icon-armour-proc');
ok(ha && ha.cost === 30 && ha.weaponKeywords.includes('IMPERVIOUS') && state(PR, M('pilgrim'), 'holy-icon-armour-proc') === 'available', 'Holy Icon Armour: 30 👑, -1 INJURY MODIFIER, IMPERVIOUS');
ok(state(BASE, M('pilgrim'), 'holy-icon-armour-proc') === 'hidden', 'sin variante: sin Holy Icon Armour');
const z2 = [M('pilgrim', [], ['zealot-strength-pilgrim']), M('martyr-penitent', [], ['zealot-strength-martyr'])];
const p3 = M('pilgrim');
ok(upState(PR(z2.concat(p3)), p3, 'zealot-strength-pilgrim') === 'available', 'Zealot Strength: hasta 3');
const z3 = z2.concat(M('pilgrim', [], ['zealot-strength-pilgrim']));
ok(upState(PR(z3.concat(p3)), p3, 'zealot-strength-pilgrim') === 'disabled', 'Zealot Strength: no un 4.º');
const wr = M('castigator', [], ['wrath-of-god']);
const mp2 = M('martyr-penitent');
ok(upState(PR([mp2]), mp2, 'wrath-of-god') === 'available', 'Wrath of God también para Martyr Penitent');
ok(upState(PR([wr, mp2]), mp2, 'wrath-of-god') === 'disabled', 'Wrath of God: solo 1 modelo');
ok(X.effectiveStats(wr, X.getUnit(TP, 'castigator'), PR([wr])).base === '32mm', 'Wrath of God: base 32mm');

console.log('\nGroup 3: War Pilgrimage of Saint Methodius');
ok(state(ME, M('anchorite-shrine'), 'autocannon-anchor') === 'available', 'Anchorite Armoury: armas de Anchorite');
ok(X.canAddUnit(ME([M('anchorite-shrine')]), X.getUnitWithVariant(ME(), 'anchorite-shrine')), 'Anchorite Cloister: 2 Anchorite Shrines');
const nuns3 = [1, 2, 3].map(() => M('stigmatic-nuns'));
ok(!X.canAddUnit(ME(nuns3), X.getUnitWithVariant(ME(), 'stigmatic-nuns')), 'Chaste Order: máx. 3 Stigmatic Nuns');
ok(state(ME, M('stigmatic-nuns'), 'standard-tp') === 'available', 'Chaste Order: las Nuns pueden llevar Standard Armour');
ok(X.checkUpgradeLegality(ME([M('stigmatic-nuns')])).some(w => /Standard Armour/.test(w)), 'aviso: Nun sin Standard Armour');
ok(!X.canAddUnit(ME(), X.DATA.mercenaries.find(m => m.id === 'ammo-monk')) && !X.canAddUnit(ME(), X.DATA.mercenaries.find(m => m.id === 'antitank-comm')), 'Communicant Heresy: sin Ammo Monk ni Anti-Tank Hunter');
ok(!X.canAddUnit(ME(), X.getUnit(TP, 'martyr-penitent')), 'Treasure in Heaven: sin Martyr Penitents');
ok(!X.allAvailableUpgrades(pris, ME()).some(u => u.id === 'martyrdom-device'), 'Mortal Sin: sin Martyrdom Device');
const mg = X.findBattlekitItem(TP, 'mg-tp', ME());
const smg = X.findBattlekitItem(TP, 'smg-tp', ME());
ok(mg.cost === 50 && mg.currency === '👑' && /Limit: 2/.test(mg.restriction), 'Machine Gun: 50 👑, Limit 2');
ok(smg.cost === 30 && smg.currency === '👑' && /Limit: 1/.test(smg.restriction), 'Submachine Gun: 30 👑, Limit 1');
const ar = X.findBattlekitItem(TP, 'auto-rifle-meth');
ok(ar && ar.cost === 40 && /Bayonet Lug/.test(ar.restriction) && /Limit: 1/.test(ar.restriction) && state(ME, M('pilgrim'), 'auto-rifle-meth') === 'available', 'Automatic Rifle: 40 👑, Bayonet Lug, Limit 1');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
