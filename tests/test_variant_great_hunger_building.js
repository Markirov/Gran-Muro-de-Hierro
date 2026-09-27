/* The Great Hunger 1.0.2 (variante de Cult of the Black Grail): creación de banda.
 * Butcher Knights, Cradle of Filth, Desiccated Husks, Excruciating Hunger,
 * The Great Maw, Spawn of Gluttony, armería propia, Strains of the Great
 * Hunger y entradas (Matagot Hag, Ravenous, Gregori Gula). Eternal
 * Appetence es regla de partida.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, allAvailableUpgrades, classifyUpgrade, effectiveAbilities, effectiveKeywords, effectiveStats, checkUpgradeLegality, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const BG = 'black-grail';
const GH = (models = []) => ({ factionId: BG, variantId: 'great-hunger', models });
const BASE = (models = []) => ({ factionId: BG, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(BG, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(BG, model.unitId), wb).state;
}
const ups = (wb, uid) => X.allAvailableUpgrades(X.getUnit(BG, uid), wb);
const upState = (wb, model, upId) => {
  const unit = X.getUnit(BG, model.unitId);
  const up = X.allAvailableUpgrades(unit, wb).find(u => u.id === upId);
  return up ? X.classifyUpgrade(up, model, unit, wb).state : 'missing';
};
const U = id => X.getUnit(BG, id);

console.log('\nGroup 1: entradas');
const hag = U('matagot-hag-gh');
ok(hag && hag.cost === 135 && hag.stats.melee === '+2 DICE' && hag.stats.base === '60mm' && ['ELITE', 'LEADER', 'TOUGH', 'FEAR', 'NEGATE GAS'].every(k => hag.keywords.includes(k)), 'Matagot Hag: 135 👑, Melee +2, 60mm, ELITE LEADER TOUGH');
ok(hag && ['Cadre of Flesh', 'Frenzied Followers', "Mother's Call ACTION", 'Pestilent', 'Undead Fortitude'].every(a => hag.abilities.includes(a)), 'Matagot Hag: habilidades');
ok(["Mother's Call ACTION", 'Cadre of Flesh', 'Pestilent', 'Gluttonous Horde', 'Ravenous Infection ACTION'].every(a => X.lookupRuleText(a)), 'textos de la Hag y los Ravenous');
ok(X.checkUpgradeLegality(GH([M('ravenous-gh')])).some(w => /Matagot Hag/.test(w)), 'Spawn of Gluttony: aviso si falta la Matagot Hag');
ok(!X.checkUpgradeLegality(GH([M('matagot-hag-gh')])).some(w => /Plague Knight/.test(w)), 'no exige Plague Knight');
ok(!X.canAddUnit(GH([M('matagot-hag-gh')]), X.getUnitWithVariant(GH(), 'matagot-hag-gh')), 'solo 1 Matagot Hag');
ok(['lord-tumours', 'corpse-guards', 'grail-thralls', 'heralds', 'amalgam'].every(id => !X.canAddUnit(GH(), U(id))), 'Spawn of Gluttony: sin Lord of Tumours, Corpse Guards, Grail Thralls, Heralds ni Amalgam');
ok(X.canAddUnit(GH(), U('thralls')) && X.canAddUnit(GH(), U('hounds-bg')), 'Fly Thralls y Hounds sí');
const rv = U('ravenous-gh');
ok(rv && rv.cost === 35 && rv.stats.movement === '5"/Infantry' && rv.stats.melee === '+0 DICE' && rv.limit == null, 'Ravenous: 35 👑, 5", Melee +0, sin límite');
ok(state(GH, M('ravenous-gh'), 'sword-bg') === 'hidden', 'Ravenous sin Battlekit');
ok(!X.canAddUnit(BASE(), rv), 'sin variante: sin Ravenous');
const cr = U('cradle-thralls-gh');
ok(cr && cr.cost === 2 && cr.currency === '☼' && cr.keywords.includes('INFILTRATOR') && cr.limit === '0-3', 'Cradle Thralls: 0-3, 2 ☼, INFILTRATOR');
const hk = U('husks-gh');
ok(hk && hk.cost === U('corpse-guards').cost && hk.limit === '0-2' && hk.abilities.includes('More Worm Than Man') && !hk.abilities.includes('Black Grail Bodyguard'), 'Desiccated Husks: entrada de Corpse Guard, 0-2, More Worm Than Man en vez de Bodyguard');
const mw = U('great-maw-gh');
ok(mw && mw.cost === U('lord-tumours').cost && !mw.keywords.includes('LEADER') && mw.limit === '0-1', 'Great Maw: entrada de Lord of Tumours sin LEADER, 0-1');
ok(!X.canAddUnit(GH([M('matagot-hag-gh')]), mw), 'Great Maw: no por debajo de 1.000 👑');
const rich = [M('matagot-hag-gh')].concat(Array.from({ length: 25 }, () => M('ravenous-gh')));
ok(X.canAddUnit(GH(rich), mw), 'Great Maw: sí con 1.000 👑 o más en el resto');
const gg = U('gregori-gula-gh');
ok(gg && gg.cost === 140 && gg.limit === '0-2' && gg.stats.movement === '9"/Flying' && gg.keywords.includes('INFILTRATOR'), 'Gregori Gula: 0-2, 140 👑, 9"/Flying, INFILTRATOR');
const vo = ups(GH(), 'gregori-gula-gh').find(u => u.id === 'vomitus-gh');
ok(vo && vo.cost === 40 && /Torrent of Bile/.test(vo.note), 'Unholy Gut: Vomitus 40 👑');

console.log('\nGroup 2: Butcher Knights');
const pkA = X.effectiveAbilities(M('plague-knights'), U('plague-knights'), GH());
ok(pkA.includes('Ravenous Infection ACTION') && !pkA.includes('Plague Knight Ranks'), 'Plague Knights: Ravenous Infection y sin los rangos normales');
const ranks = { 'rank-butcher-king': 10, 'rank-feast-companion': 5, 'rank-twin-cleavers': 5 };
const pkUps = ups(GH(), 'plague-knights');
ok(Object.keys(ranks).every(id => { const u = pkUps.find(x => x.id === id); return u && u.cost === ranks[id]; }), 'rangos: Butcher King 10, Knight Companion of the Feast 5, Knight of Twin Cleavers 5');
ok(new Set(Object.keys(ranks).map(id => pkUps.find(x => x.id === id).mutuallyExclusiveGroup)).size === 1, 'solo un rango por Plague Knight');

console.log('\nGroup 3: Battlekit');
const banned = ['beelz-axe-bg', 'bg-shield-bg', 'bolt-rifle-bg', 'blunderbuss-bg', 'compound-eyes-bg', 'corruption-belcher-bg', 'gas-bg', 'infested-rifle-bg', 'mg-bg', 'music-bg', 'musket-bg', 'pistol-bg', 'flag-bg', 'viscera-cannon-bg'];
ok(banned.every(id => state(GH, M('plague-knights'), id) === 'hidden'), 'Excruciating Hunger: 14 piezas prohibidas');
ok(state(GH, M('plague-knights'), 'putrid-shotgun-bg') === 'available' && state(GH, M('plague-knights'), 'plague-blade-bg') === 'available', 'Putrid Shotgun y Plague Blade siguen');
const bsr = X.findBattlekitItem(BG, 'black-spot-rifle-gh');
ok(bsr && bsr.cost === 25 && bsr.range === '18"' && bsr.weaponKeywords.includes('INFECTION MARKERS') && /Bayonet Lug/.test(bsr.restriction) && /Fresh Meat/.test(bsr.note), 'Black Spot Rifle: 25 👑, 18", Bayonet Lug, Limit 2');
const bb = X.findBattlekitItem(BG, 'butcher-bayonet-gh');
ok(bb && bb.cost === 15 && bb.weaponKeywords.includes('CUMBERSOME') && /Hack and Hew/.test(bb.note), 'Butcher Bayonet: 15 👑, +1 INJURY DICE, CUMBERSOME');
ok(state(GH, M('plague-knights'), 'butcher-bayonet-gh') === 'disabled' && state(GH, M('plague-knights', ['black-spot-rifle-gh']), 'butcher-bayonet-gh') === 'available', 'Butcher Bayonet requiere arma con Bayonet Lug');
const pf = X.findBattlekitItem(BG, 'pestilent-fang-gh');
ok(pf && pf.cost === 15 && pf.weaponKeywords.includes('HEAVY') && /Limit: 2/.test(pf.restriction), 'Pestilent Fang: 15 👑, +1 INJURY MODIFIER, HEAVY, Limit 2');
const cup = X.findBattlekitItem(BG, 'cup-filth-gh');
const pal = X.findBattlekitItem(BG, 'palanquin-gh');
ok(cup && cup.cost === 4 && cup.currency === '☼' && pal && pal.cost === 4 && pal.currency === '☼' && pal.type === 'Armour', 'Cup of Filth y Foetid Palanquin: 4 ☼');
ok(state(GH, M('matagot-hag-gh'), 'cup-filth-gh') === 'available' && state(GH, M('matagot-hag-gh'), 'palanquin-gh') === 'available' && state(GH, M('matagot-hag-gh'), 'grail-devotee-bg') === 'available', 'Matagot Hag: Cup, Palanquin, Grail Devotee');
ok(state(GH, M('matagot-hag-gh'), 'sword-bg') === 'hidden' && state(GH, M('matagot-hag-gh'), 'helmet-bg') === 'hidden', 'Matagot Hag: nada más');
ok(state(GH, M('plague-knights'), 'cup-filth-gh') === 'hidden', 'Cup of Filth: solo Matagot Hag');
ok(state(BASE, M('plague-knights'), 'pestilent-fang-gh') === 'hidden', 'sin variante: sin Pestilent Fang');

console.log('\nGroup 4: Strains');
const st = { 'strain-devouring-jaws': [2, '☼'], 'strain-grasping-maw': [15, '👑'], 'strain-hellfly-host': [0, '👑'], 'strain-lockjaw-bite': [15, '👑'], 'strain-papillal-hide': [5, '👑'], 'strain-rotten-cutters': [7, '👑'], 'strain-unending-starvation': [10, '👑'] };
const rvUps = ups(GH(), 'ravenous-gh');
ok(['strain-grasping-maw', 'strain-hellfly-host', 'strain-lockjaw-bite', 'strain-papillal-hide', 'strain-rotten-cutters', 'strain-unending-starvation'].every(id => { const u = rvUps.find(x => x.id === id); return u && u.cost === st[id][0] && u.currency === st[id][1]; }), 'Ravenous: sus 6 Strains con coste');
const dj = ups(GH(), 'plague-knights').find(u => u.id === 'strain-devouring-jaws');
ok(dj && dj.cost === 2 && dj.currency === '☼', 'Devouring Jaws: 2 ☼ (ELITE)');
ok(!rvUps.some(u => u.id === 'strain-devouring-jaws'), 'Devouring Jaws: no Ravenous (no ELITE)');
ok(upState(GH([M('plague-knights', [], ['strain-devouring-jaws'])]), M('matagot-hag-gh'), 'strain-devouring-jaws') === 'disabled', 'Devouring Jaws: Limit 1');
ok(!ups(GH(), 'plague-knights').some(u => u.id === 'strain-hellfly-host') && !ups(GH(), 'hounds-bg').some(u => u.id === 'strain-rotten-cutters'), 'Hellfly Host solo Ravenous; Rotten Cutters solo Hag y Ravenous');
ok(ups(GH(), 'hounds-bg').some(u => u.id === 'strain-papillal-hide') && ups(GH(), 'husks-gh').some(u => u.id === 'strain-unending-starvation'), 'Papillal Hide para Hounds; Unending Starvation para Husks');
const r3 = M('ravenous-gh', [], ['strain-lockjaw-bite', 'strain-papillal-hide']);
ok(upState(GH([r3]), r3, 'strain-rotten-cutters') === 'available', 'Ravenous: hasta 3 Strains');
const r4 = M('ravenous-gh', [], ['strain-lockjaw-bite', 'strain-papillal-hide', 'strain-rotten-cutters']);
ok(upState(GH([r4]), r4, 'strain-grasping-maw') === 'disabled', 'Ravenous: no un 4.º Strain');
const h1 = M('matagot-hag-gh', [], ['strain-rotten-cutters']);
ok(upState(GH([h1]), h1, 'strain-lockjaw-bite') === 'disabled', 'resto: 1 Strain por modelo');
const hh = M('ravenous-gh', [], ['strain-hellfly-host']);
ok(X.effectiveStats(hh, rv, GH([hh])).movement === '6"/Flying' && X.effectiveKeywords(hh, rv, GH([hh])).includes('FLYING'), 'Hellfly Host: 6"/Flying y FLYING');
ok(ups(GH(), 'cradle-thralls-gh').some(u => u.id === 'strain-hellfly-host'), 'Cradle Thralls (entrada de Ravenous): Strains de Ravenous');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
