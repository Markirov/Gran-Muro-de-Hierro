/* Dirge of the Great Hegemon (Warbands 1.0.2): creación de banda.
 * The Executor, The Fallen, The Lost, The Bereaved, Dishonoured, Hegemon's
 * Last Blessing, Hegemon's Will y armería propia (Broken Crown, Urn of the
 * Bitter Ashes). Incluye la regla base: los Thralls no tienen Battlekit.
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
dom.window.eval(js.slice(0, bootIdx) + '\n;window.__X = { DATA, classifyBattlekitItem, findBattlekitItem, getUnit, getUnitWithVariant, canAddUnit, modelCost, effectiveAbilities, effectiveStats, checkUpgradeLegality, lookupRuleText };');
const X = dom.window.__X;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }

const BG = 'black-grail';
const DG = (models = []) => ({ factionId: BG, variantId: 'great-hegemon', models });
const BASE = (models = []) => ({ factionId: BG, variantId: null, models });
const M = (unitId, bk = [], ups = []) => ({ uid: unitId + Math.random(), unitId, battlekit: bk, upgrades: ups });
function state(wbf, model, itemId, others = []) {
  const wb = wbf(others.concat(model));
  const item = X.findBattlekitItem(BG, itemId, wb);
  if (!item) return 'missing';
  return X.classifyBattlekitItem(item, model, X.getUnit(BG, model.unitId), wb).state;
}

console.log('\nGroup 1: regla base');
ok(state(BASE, M('grail-thralls'), 'pistol-bg') === 'hidden' && state(BASE, M('thralls'), 'sword-bg') === 'hidden', 'Grail/Fly Thralls sin Battlekit');

console.log('\nGroup 2: unidades');
const ex = X.getUnit(BG, 'executor-dg');
const pk = X.getUnit(BG, 'plague-knights');
ok(ex && ex.cost === 80 && ex.stats.ranged === '+1 DICE' && ex.stats.melee === pk.stats.melee && ex.keywords.includes('LEADER') && ex.keywords.includes('TOUGH'), 'Executor: entrada de Plague Knight, Ranged +1 DICE, LEADER, TOUGH, 80 👑');
ok(X.checkUpgradeLegality(DG([M('plague-knights')])).some(w => /Executor/.test(w)), 'aviso: falta el Executor');
ok(!X.checkUpgradeLegality(DG([M('executor-dg')])).some(w => /Plague Knight/.test(w)), 'sin aviso de Plague Knight');
ok(X.canAddUnit(DG([M('executor-dg'), M('plague-knights')]), X.getUnitWithVariant(DG(), 'plague-knights')), 'además 0-2 Plague Knights');
ok(!X.canAddUnit(DG([M('executor-dg')]), X.getUnitWithVariant(DG(), 'executor-dg')), 'solo 1 Executor');
ok(!X.canAddUnit(BASE(), ex), 'sin variante: sin Executor');
ok(!X.canAddUnit(DG(), X.getUnit(BG, 'lord-tumours')) && !X.canAddUnit(DG(), X.getUnit(BG, 'amalgam')), 'The Fallen: sin Lord of Tumours ni Amalgam');
ok(!X.canAddUnit(DG([M('hounds-bg'), M('hounds-bg')]), X.getUnitWithVariant(DG(), 'hounds-bg')), 'The Lost: 0-2 Hounds');
ok(!X.canAddUnit(DG([M('heralds'), M('heralds')]), X.getUnitWithVariant(DG(), 'heralds')), 'The Lost: 0-2 Heralds');
for (const id of ['grail-thralls', 'thralls']) {
  const m = M(id);
  ok(X.modelCost(m, BG, DG([m])).ducados === 30 && X.effectiveStats(m, X.getUnit(BG, id), DG([m])).ranged === '+0 DICE', 'The Bereaved: ' + id + ' 30 👑, Ranged +0 DICE');
}
ok(state(DG, M('grail-thralls'), 'pistol-bg') === 'available' && state(DG, M('thralls'), 'gas-bg') === 'available', 'The Bereaved: Ranged Weapons y Grenades');
ok(state(DG, M('grail-thralls'), 'music-bg') === 'available' && state(DG, M('grail-thralls'), 'flag-bg') === 'available', 'The Bereaved: Musical Instrument y Troop Flag');
ok(state(DG, M('grail-thralls'), 'sword-bg') === 'hidden' && state(DG, M('grail-thralls'), 'standard-bg') === 'hidden' && state(DG, M('grail-thralls'), 'helmet-bg') === 'hidden', 'The Bereaved: nada más (melee, armadura, otro Equipment)');
const exA = X.effectiveAbilities(M('executor-dg'), ex, DG());
const pkA = X.effectiveAbilities(M('plague-knights'), pk, DG());
ok(exA.includes('Command Bereaved ACTION') && pkA.includes('Command Bereaved ACTION'), "Hegemon's Will: Command Bereaved ACTION (Executor y Plague Knights)");
ok(/18"/.test(X.lookupRuleText('Command Bereaved ACTION') || ''), 'Command Bereaved con texto');

console.log('\nGroup 3: Battlekit');
ok(state(DG, M('executor-dg'), 'beelz-axe-bg') === 'hidden' && state(DG, M('executor-dg'), 'bg-shield-bg') === 'hidden', "Dishonoured: sin Beelzebub's Axe ni Black Grail Shield");
const vc = X.findBattlekitItem(BG, 'viscera-cannon-bg', DG());
ok(/Limit: 3/.test(vc.restriction) && !/ELITE/.test(vc.restriction) && state(DG, M('grail-thralls'), 'viscera-cannon-bg') === 'available', "Hegemon's Last Blessing: Viscera Cannon Limit 3 sin ELITE only");
ok(/Limit: 3/.test(X.findBattlekitItem(BG, 'putrid-shotgun-bg', DG()).restriction), 'Putrid Shotgun Limit 3');
const bc = X.findBattlekitItem(BG, 'broken-crown-dg');
const urn = X.findBattlekitItem(BG, 'urn-ashes-dg');
ok(bc && bc.cost === 25 && /ELITE only/.test(bc.restriction) && /Limit: 1/.test(bc.restriction) && /Locus of Despair/.test(bc.note), 'Broken Crown: 25 👑, ELITE, Limit 1');
ok(urn && urn.cost === 40 && /ELITE only/.test(urn.restriction) && /Sinister Whispers/.test(urn.note), 'Urn of the Bitter Ashes: 40 👑, ELITE, Limit 1');
ok(state(DG, M('executor-dg'), 'broken-crown-dg') === 'available' && state(BASE, M('plague-knights'), 'broken-crown-dg') === 'hidden', 'Broken Crown solo en la variante');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
