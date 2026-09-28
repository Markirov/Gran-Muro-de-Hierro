/* Knights of Avarice (Warbands 1.0.2): creación de banda.
 * Corrupt Merchants, Gas Bombs, Goetic Warlocks, Infernal Rivalry, Mammon's
 * Chosen, Preserve the Loot, Price of Greed y armería propia. Incluye la
 * entrada base de la Artillery Witch (Infernal Bombs, sin Ranged ni Grenades).
 * Worship Mammon (Patrón) es de campaña.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, effectiveAbilities, effectiveKeywords, checkUpgradeLegality, foreignArmouryItems, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const HL = 'heretic-legions';
const KA = (models = []) => ({ factionId: HL, variantId: 'avarice-knights', models });
const BASE = (models = []) => ({ factionId: HL, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(HL, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(HL, model.unitId), wb).state;
}

console.log('\nGroup 1: Artillery Witch base');
const aw = X.getUnit(HL, 'art-witch');
ok(aw.keywords.includes('NEGATE FEAR') && aw.keywords.includes('NEGATE GAS'), 'Artillery Witch: NEGATE FEAR y NEGATE GAS');
ok((aw.permanentEquipment || []).includes('Infernal Bombs'), 'Artillery Witch: siempre tiene Infernal Bombs');
ok(aw.abilities.includes('Levitate') && X.lookupRuleText('Levitate'), 'Artillery Witch: Levitate con texto');
ok(state(BASE, M('art-witch'), 'bolt-rifle-hl') === 'hidden' && state(BASE, M('art-witch'), 'frag-hl') === 'hidden', 'Artillery Witch: sin Ranged ni Grenades');
ok(state(BASE, M('art-witch'), 'sword-hl') === 'available', 'Artillery Witch: sí melee');

console.log('\nGroup 2: unidades');
const awK = X.getUnitWithVariant(KA(), 'art-witch');
ok(awK.permanentEquipment.includes('Gas Bombs') && !awK.permanentEquipment.includes('Infernal Bombs'), 'Gas Bombs: sustituyen a las Infernal Bombs');
ok(/Choking Gas/.test(X.lookupRuleText('Gas Bombs') || ''), 'Gas Bombs con texto');
ok(!X.canAddUnit(KA(), X.getUnit(HL, 'death-commando')), 'Infernal Rivalry: sin Death Commando');
const gw = X.DATA.mercenaries.find(m => m.id === 'goetic-warlock');
const g1 = M('goetic-warlock');
ok(X.canAddUnit(KA([g1]), X.getUnitWithVariant(KA(), 'goetic-warlock')), 'Goetic Warlocks: hasta 2');
ok(!X.canAddUnit(KA([g1, M('goetic-warlock')]), X.getUnitWithVariant(KA(), 'goetic-warlock')), 'Goetic Warlocks: no un 3.º');
ok(!X.canAddUnit(BASE([g1]), gw), 'sin variante: 1 Goetic Warlock');
const g2 = M('goetic-warlock');
const c1 = X.modelCost(g1, HL, KA([g1, g2]));
const c2 = X.modelCost(g2, HL, KA([g1, g2]));
ok(c1.ducados === 110 && c1.glory === 0, 'el primer Goetic Warlock cuesta 110 👑');
ok(c2.ducados === 0 && c2.glory === 4, 'el segundo cuesta 4 ☼');
ok(X.modelCost(g1, HL, BASE([g1])).glory === 4, 'sin variante: 4 ☼');
const hp = X.effectiveAbilities(M('heretic-priest'), X.getUnit(HL, 'heretic-priest'), KA());
ok(hp.includes('Price of Greed ACTION') && !hp.includes('Puppet Master ACTION'), 'Price of Greed en vez de Puppet Master');
ok(/12"/.test(X.lookupRuleText('Price of Greed ACTION') || ''), 'Price of Greed con texto');

console.log("\nGroup 3: Mammon's Chosen");
const cheap = M('heretic-troopers');
ok(X.checkUpgradeLegality(KA([M('heretic-priest'), cheap])).some(w => /80/.test(w)), 'aviso: Heretic Trooper por debajo de 80 👑');
ok(!X.checkUpgradeLegality(KA([M('heretic-priest'), M('wretched-hl')])).some(w => /80/.test(w)), 'Wretched exentos');
ok(!X.checkUpgradeLegality(BASE([M('heretic-priest'), cheap])).some(w => /80/.test(w)), 'sin variante: sin aviso');

console.log('\nGroup 4: Battlekit');
ok(state(KA, M('heretic-troopers'), 'frag-hl') === 'hidden', 'Preserve the Loot: sin Frag Grenades (SHRAPNEL)');
ok(state(KA, M('heretic-troopers'), 'incend-hl') === 'hidden', 'Preserve the Loot: sin Incendiary Grenades (FIRE)');
ok(state(KA, M('heretic-troopers'), 'incend-ammo-hl') === 'hidden', 'Preserve the Loot: sin Incendiary Ammunition (da FIRE)');
ok(state(KA, M('heretic-troopers'), 'inf-brand-hl') === 'available', 'NEGATE FIRE no cuenta como FIRE');
const gl = X.findBattlekitItem(HL, 'grenade-launcher-hl', KA());
ok(!gl.weaponKeywords.includes('SHRAPNEL') && ['-1 INJURY DICE', 'GAS', 'IGNORE ARMOUR'].every(k => gl.weaponKeywords.includes(k)) && state(KA, M('heretic-troopers'), 'grenade-launcher-hl') === 'available', 'Grenade Launcher: SHRAPNEL → -1 INJURY DICE, GAS, IGNORE ARMOUR');
const fa = X.foreignArmouryItems(KA());
ok(fa.length === 2 && fa.some(x => x.factionId === 'new-antioch') && fa.some(x => x.factionId === 'iron-sultanate') && fa.every(x => x.max === 1), 'Corrupt Merchants: 1 de New Antioch y 1 del Iron Sultanate');
ok(!fa.some(x => x.items.some(it => (it.weaponKeywords || []).includes('SHRAPNEL'))), 'Corrupt Merchants: tampoco FIRE/SHRAPNEL de fuera');
const items = { 'coin-hammer-ka': 20, 'calf-altar-ka': 20, 'standard-mammon-ka': 25, 'tarnished-ka': 25 };
ok(Object.keys(items).every(id => { const it = X.findBattlekitItem(HL, id); return it && it.cost === items[id]; }), 'armería propia: Coin Hammer 20, Golden Calf Altar 20, Standard of Mammon 25, Tarnished Armour 25');
const ch = X.findBattlekitItem(HL, 'coin-hammer-ka');
ok(ch.type === '2-Handed' && ch.weaponKeywords.includes('HEAVY') && /Limit: 2/.test(ch.restriction) && /Rune of Mammon/.test(ch.note), 'Coin Hammer: 2H, +1 INJURY DICE, HEAVY, Limit 2');
ok(/Limit: 3/.test(X.findBattlekitItem(HL, 'calf-altar-ka').restriction) && X.findBattlekitItem(HL, 'standard-mammon-ka').weaponKeywords.includes('LEADER'), 'Golden Calf Altar Limit 3, Standard of Mammon HELD LEADER');
const ta = X.findBattlekitItem(HL, 'tarnished-ka');
ok(ta.type === 'Armour' && ta.weaponKeywords.includes('NEGATE GAS') && /Target of Wrath/.test(ta.note), 'Tarnished Armour: -2 INJURY MODIFIER, NEGATE GAS, Target of Wrath');
ok(state(BASE, M('heretic-troopers'), 'coin-hammer-ka') === 'hidden', 'sin variante: sin Coin Hammer');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
